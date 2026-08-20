/*
  # Quotation Revision Management System

  1. New Tables
    - `quotation_revisions`
      - `id` (uuid, primary key) - Unique identifier for each revision
      - `quotation_id` (uuid) - Reference to parent quotation
      - `user_id` (uuid) - User who created the revision
      - `revision_number` (integer) - Sequential revision number (0, 1, 2, etc.)
      - `data` (jsonb) - Complete snapshot of quotation data at this revision
      - `issued_price` (numeric) - Price when issued to customer
      - `issued_at` (timestamptz) - When this revision was issued
      - `revision_notes` (text) - Notes explaining changes in this revision
      - `status` (text) - Status: draft, issued, revised, accepted, rejected
      - `created_at` (timestamptz) - Creation timestamp
      - `created_by_name` (text) - Name of person who created revision

  2. Updates to quotations table
    - Add `current_revision` (integer) - Current active revision number
    - Add `status` (text) - Current status
    - Add `parent_quotation_id` (uuid) - For duplicated quotations

  3. Security
    - Enable RLS on `quotation_revisions` table
    - Add policies for users to manage their own revisions

  4. Indexes
    - Index on quotation_id for faster revision lookups
    - Index on revision_number for ordering
    - Composite index on (quotation_id, revision_number) for unique constraint

  5. Notes
    - Each time a quotation is "issued", a revision snapshot is created
    - Revisions are immutable once created
    - Quotation can be duplicated to create templates
*/

-- Add new columns to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'current_revision'
  ) THEN
    ALTER TABLE quotations ADD COLUMN current_revision integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'status'
  ) THEN
    ALTER TABLE quotations ADD COLUMN status text DEFAULT 'draft';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'parent_quotation_id'
  ) THEN
    ALTER TABLE quotations ADD COLUMN parent_quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create quotation_revisions table
CREATE TABLE IF NOT EXISTS quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revision_number integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL,
  issued_price numeric(12, 2),
  issued_at timestamptz,
  revision_notes text DEFAULT '',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  created_by_name text DEFAULT '',
  UNIQUE(quotation_id, revision_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_revisions_quotation_id ON quotation_revisions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_revisions_revision_number ON quotation_revisions(revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON quotation_revisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_parent_id ON quotations(parent_quotation_id);

-- Enable RLS
ALTER TABLE quotation_revisions ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own quotation revisions"
  ON quotation_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quotation revisions"
  ON quotation_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own quotation revisions"
  ON quotation_revisions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own quotation revisions"
  ON quotation_revisions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- Policies for anonymous users
CREATE POLICY "Anonymous can view own quotation revisions"
  ON quotation_revisions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id IS NULL
    )
  );

CREATE POLICY "Anonymous can insert quotation revisions"
  ON quotation_revisions FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id IS NULL
    )
  );

CREATE POLICY "Anonymous can update quotation revisions"
  ON quotation_revisions FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id IS NULL
    )
  );

CREATE POLICY "Anonymous can delete quotation revisions"
  ON quotation_revisions FOR DELETE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = quotation_revisions.quotation_id
      AND quotations.user_id IS NULL
    )
  );

-- Function to create a revision snapshot
CREATE OR REPLACE FUNCTION create_revision_snapshot(
  p_quotation_id uuid,
  p_revision_notes text DEFAULT '',
  p_issued_price numeric DEFAULT NULL,
  p_status text DEFAULT 'draft'
)
RETURNS uuid AS $$
DECLARE
  v_revision_id uuid;
  v_quotation_data jsonb;
  v_user_id uuid;
  v_user_name text;
  v_next_revision_number integer;
BEGIN
  -- Get quotation data and user info
  SELECT data, user_id INTO v_quotation_data, v_user_id
  FROM quotations
  WHERE id = p_quotation_id;

  IF v_quotation_data IS NULL THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  -- Get user name
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(raw_user_meta_data->>'engineer_name', email, 'Unknown')
    INTO v_user_name
    FROM auth.users
    WHERE id = v_user_id;
  ELSE
    v_user_name := 'Anonymous';
  END IF;

  -- Get next revision number
  SELECT COALESCE(MAX(revision_number), -1) + 1
  INTO v_next_revision_number
  FROM quotation_revisions
  WHERE quotation_id = p_quotation_id;

  -- Create revision record
  INSERT INTO quotation_revisions (
    quotation_id,
    user_id,
    revision_number,
    data,
    issued_price,
    issued_at,
    revision_notes,
    status,
    created_by_name
  ) VALUES (
    p_quotation_id,
    v_user_id,
    v_next_revision_number,
    v_quotation_data,
    p_issued_price,
    CASE WHEN p_status = 'issued' THEN now() ELSE NULL END,
    p_revision_notes,
    p_status,
    v_user_name
  ) RETURNING id INTO v_revision_id;

  -- Update quotation with current revision number and status
  UPDATE quotations
  SET
    current_revision = v_next_revision_number,
    status = p_status
  WHERE id = p_quotation_id;

  RETURN v_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
