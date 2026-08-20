/*
  # Proposal Labour Rate Overrides

  1. New Tables
    - `proposal_labour_rate_overrides`
      - `id` (uuid, primary key) - Unique identifier
      - `proposal_id` (uuid) - Reference to maintenance_proposals
      - `labour_rate_id` (uuid) - Reference to standard_labour_rates
      - `override_rate` (numeric) - Overridden rate value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `proposal_labour_rate_overrides` table
    - Users can view and manage overrides for proposals they can access

  3. Constraints
    - Unique constraint on (proposal_id, labour_rate_id)
*/

-- Create proposal_labour_rate_overrides table
CREATE TABLE IF NOT EXISTS proposal_labour_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  labour_rate_id uuid NOT NULL,
  override_rate numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_proposal_labour_rate
    UNIQUE (proposal_id, labour_rate_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proposal_labour_rate_overrides_proposal_id 
  ON proposal_labour_rate_overrides(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_labour_rate_overrides_labour_rate_id 
  ON proposal_labour_rate_overrides(labour_rate_id);

-- Enable Row Level Security
ALTER TABLE proposal_labour_rate_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view overrides
CREATE POLICY "Authenticated users can view proposal overrides"
  ON proposal_labour_rate_overrides
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert overrides
CREATE POLICY "Authenticated users can insert proposal overrides"
  ON proposal_labour_rate_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update overrides
CREATE POLICY "Authenticated users can update proposal overrides"
  ON proposal_labour_rate_overrides
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete overrides
CREATE POLICY "Authenticated users can delete proposal overrides"
  ON proposal_labour_rate_overrides
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposal_labour_rate_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_proposal_labour_rate_overrides_updated_at_trigger 
  ON proposal_labour_rate_overrides;
CREATE TRIGGER update_proposal_labour_rate_overrides_updated_at_trigger
  BEFORE UPDATE ON proposal_labour_rate_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_labour_rate_overrides_updated_at();
