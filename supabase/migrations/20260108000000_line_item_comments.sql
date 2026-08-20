/*
  # Line Item Comments System

  1. New Tables
    - `line_item_comments`
      - `id` (uuid, primary key)
      - `quotation_id` (uuid, references quotations)
      - `line_item_id` (text, the ID of the line item)
      - `user_id` (uuid, references auth.users)
      - `comment` (text, the comment content)
      - `mentions` (text array, user IDs mentioned in comment)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `line_item_comments` table
    - Allow authenticated users to view comments on quotations they can access
    - Allow all authenticated users (including read-only) to create comments
    - Allow users to update/delete their own comments
*/

-- Create line_item_comments table
CREATE TABLE IF NOT EXISTS line_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  line_item_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  mentions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_line_item_comments_quotation ON line_item_comments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_line_item_comments_line_item ON line_item_comments(line_item_id);
CREATE INDEX IF NOT EXISTS idx_line_item_comments_user ON line_item_comments(user_id);

-- Enable RLS
ALTER TABLE line_item_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on quotations they have access to
CREATE POLICY "Users can view comments on accessible quotations"
  ON line_item_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      LEFT JOIN quotation_shares qs ON q.id = qs.quotation_id
      WHERE q.id = line_item_comments.quotation_id
      AND (
        q.user_id = auth.uid()
        OR qs.shared_with_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- Policy: All authenticated users can create comments (including read-only users on shared quotations)
CREATE POLICY "All authenticated users can create comments"
  ON line_item_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM quotations q
      LEFT JOIN quotation_shares qs ON q.id = qs.quotation_id
      WHERE q.id = line_item_comments.quotation_id
      AND (
        q.user_id = auth.uid()
        OR qs.shared_with_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON line_item_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON line_item_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_line_item_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_line_item_comments_updated_at ON line_item_comments;
CREATE TRIGGER update_line_item_comments_updated_at
  BEFORE UPDATE ON line_item_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_line_item_comments_updated_at();
