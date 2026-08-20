/*
  # Maintenance Proposals Table

  1. New Tables
    - `maintenance_proposals`
      - `id` (uuid, primary key) - Unique identifier for the proposal
      - `user_id` (uuid, foreign key) - User who created the proposal
      - `customer_number` (text) - Customer reference number
      - `customer_name` (text) - Name of the customer
      - `site` (text) - Site location
      - `project` (text) - Project name
      - `job_number` (text) - Job reference number
      - `prepared_by` (text) - Name/email of preparer
      - `contract_period` (integer) - Contract period in months
      - `data` (jsonb) - Complete proposal data structure
      - `status` (text) - Status (draft, submitted, approved, etc.)
      - `version` (integer) - Version number for revisions
      - `parent_id` (uuid, nullable) - Parent proposal ID for revisions
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `maintenance_proposals` table
    - Add policies for users to manage their own proposals
    - Add policies for admins to view all proposals
*/

-- Create maintenance_proposals table
CREATE TABLE IF NOT EXISTS maintenance_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_number text DEFAULT '',
  customer_name text NOT NULL,
  site text DEFAULT '',
  project text DEFAULT '',
  job_number text NOT NULL,
  prepared_by text NOT NULL,
  contract_period integer DEFAULT 12,
  data jsonb NOT NULL,
  status text DEFAULT 'draft',
  version integer DEFAULT 1,
  parent_id uuid REFERENCES maintenance_proposals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_user_id ON maintenance_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_status ON maintenance_proposals(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_job_number ON maintenance_proposals(job_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_customer_name ON maintenance_proposals(customer_name);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposals_parent_id ON maintenance_proposals(parent_id);

-- Enable Row Level Security
ALTER TABLE maintenance_proposals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own proposals
CREATE POLICY "Users can view own proposals"
  ON maintenance_proposals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all proposals
CREATE POLICY "Admins can view all proposals"
  ON maintenance_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Users can insert their own proposals
CREATE POLICY "Users can insert own proposals"
  ON maintenance_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own proposals
CREATE POLICY "Users can update own proposals"
  ON maintenance_proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update all proposals
CREATE POLICY "Admins can update all proposals"
  ON maintenance_proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Users can delete their own proposals
CREATE POLICY "Users can delete own proposals"
  ON maintenance_proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can delete all proposals
CREATE POLICY "Admins can delete all proposals"
  ON maintenance_proposals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_maintenance_proposals_updated_at_trigger ON maintenance_proposals;
CREATE TRIGGER update_maintenance_proposals_updated_at_trigger
  BEFORE UPDATE ON maintenance_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_proposals_updated_at();
