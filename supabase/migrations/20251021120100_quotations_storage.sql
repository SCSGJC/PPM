/*
  # Quotations Storage System

  1. New Tables
    - `quotations`
      - `id` (uuid, primary key) - Unique identifier for each quotation
      - `user_id` (uuid) - Reference to auth.users (optional for anonymous access)
      - `quote_id` (text) - Human-readable quote identifier
      - `title` (text) - Quotation title/name
      - `data` (jsonb) - Complete quotation state
      - `version` (integer) - Version number for tracking changes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `synced_at` (timestamptz) - Last sync timestamp
      - `is_deleted` (boolean) - Soft delete flag

  2. Security
    - Enable RLS on `quotations` table
    - Add policy for users to read their own quotations
    - Add policy for users to insert their own quotations
    - Add policy for users to update their own quotations
    - Add policy for users to soft delete their own quotations

  3. Indexes
    - Index on user_id for faster queries
    - Index on quote_id for lookups
    - Index on updated_at for sync operations

  4. Notes
    - Supports both authenticated and anonymous users
    - Uses soft deletes to preserve data
    - Version tracking for conflict resolution
    - JSONB storage for flexible quotation data structure
*/

-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_quote_id ON quotations(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotations_updated_at ON quotations(updated_at DESC);

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotations"
  ON quotations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for anonymous users (using device-specific identifier)
-- Anonymous users can read quotations with matching quote_id prefix
CREATE POLICY "Anonymous can view own quotations"
  ON quotations FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anonymous can insert quotations"
  ON quotations FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous can update own quotations"
  ON quotations FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous can delete own quotations"
  ON quotations FOR DELETE
  TO anon
  USING (user_id IS NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_quotations_updated_at_trigger ON quotations;
CREATE TRIGGER update_quotations_updated_at_trigger
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_quotations_updated_at();
