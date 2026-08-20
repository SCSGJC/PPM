/*
  # Proposal Trash System and Status Tracking

  1. Changes to Tables
    - Add `proposal_status` column to `maintenance_proposals`
      - Values: 'issued' (default), 'won', 'lost'
    - Add `is_deleted` column for soft deletes (trash system)
    - Add `deleted_at` timestamp for tracking when deleted
    - Add `deleted_by` to track who deleted it
    - Add `archived` column for archiving old lost proposals
    - Add `archived_at` timestamp

  2. Indexes
    - Add index on `is_deleted` for filtering active/trashed proposals
    - Add index on `proposal_status` for filtering by status
    - Add index on `archived` for filtering archived proposals

  3. Security
    - Update RLS policies to exclude deleted proposals from normal queries
    - Add policies for accessing trash
    - Maintain admin access to all proposals including trash

  4. Important Notes
    - Soft delete system allows recovery of accidentally deleted proposals
    - Lost proposals older than 6 months are automatically marked for archiving
    - Archived proposals remain accessible but are filtered from main views
*/

-- Add new columns to maintenance_proposals table
DO $$
BEGIN
  -- Add proposal_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'proposal_status'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN proposal_status text DEFAULT 'issued';
  END IF;

  -- Add is_deleted column for soft deletes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;

  -- Add deleted_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN deleted_at timestamptz;
  END IF;

  -- Add deleted_by user reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add archived column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'archived'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN archived boolean DEFAULT false;
  END IF;

  -- Add archived_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_proposals' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE maintenance_proposals ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Add constraint to ensure proposal_status has valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_proposals_proposal_status_check'
  ) THEN
    ALTER TABLE maintenance_proposals
    ADD CONSTRAINT maintenance_proposals_proposal_status_check
    CHECK (proposal_status IN ('issued', 'won', 'lost'));
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_is_deleted ON maintenance_proposals(is_deleted);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_proposal_status ON maintenance_proposals(proposal_status);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_archived ON maintenance_proposals(archived);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_deleted_at ON maintenance_proposals(deleted_at);

-- Drop existing policies to recreate them with trash filtering
DROP POLICY IF EXISTS "Users can view own proposals" ON maintenance_proposals;
DROP POLICY IF EXISTS "Admins can view all proposals" ON maintenance_proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON maintenance_proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON maintenance_proposals;

-- Policy: Users can view their own non-deleted proposals
CREATE POLICY "Users can view own proposals"
  ON maintenance_proposals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND is_deleted = false
  );

-- Policy: Users can view their own deleted proposals (trash)
CREATE POLICY "Users can view own trash"
  ON maintenance_proposals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND is_deleted = true
  );

-- Policy: Admins can view all proposals (including deleted and archived)
CREATE POLICY "Admins can view all proposals"
  ON maintenance_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Users can update their own non-deleted proposals
CREATE POLICY "Users can update own proposals"
  ON maintenance_proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_deleted = false)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update all proposals
CREATE POLICY "Admins can update all proposals"
  ON maintenance_proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Users can soft delete (move to trash) their own proposals
CREATE POLICY "Users can delete own proposals"
  ON maintenance_proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-archive old lost proposals
CREATE OR REPLACE FUNCTION archive_old_lost_proposals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive lost proposals that are older than 6 months
  UPDATE maintenance_proposals
  SET
    archived = true,
    archived_at = now()
  WHERE
    proposal_status = 'lost'
    AND archived = false
    AND is_deleted = false
    AND updated_at < (now() - interval '6 months');
END;
$$;