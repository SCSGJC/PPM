/*
  # Add Quotation Status Tracking

  1. Changes
    - Add `status` enum field to quotations table
      - Values: 'draft', 'issued', 'awaiting_decision', 'won', 'lost'
      - Default: 'draft'
    - Add `status_updated_at` timestamp to track when status was last changed
    - Add index on status for efficient filtering
    - Add trigger to update status_updated_at when status changes

  2. Status Flow
    - draft: Initial state when quotation is being created
    - issued: Quotation has been sent to client
    - awaiting_decision: Waiting for client decision
    - won: Quotation accepted by client
    - lost: Quotation rejected or lost to competitor

  3. Notes
    - Existing quotations will default to 'draft' status
    - Status changes are tracked with timestamps
    - Index added for performance when filtering by status
*/

-- Create enum type for quotation status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
    CREATE TYPE quotation_status AS ENUM ('draft', 'issued', 'awaiting_decision', 'won', 'lost');
  END IF;
END $$;

-- Add status column to quotations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'status'
  ) THEN
    ALTER TABLE quotations ADD COLUMN status quotation_status DEFAULT 'draft' NOT NULL;
  END IF;
END $$;

-- Add status_updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotations' AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE quotations ADD COLUMN status_updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Function to update status_updated_at when status changes
CREATE OR REPLACE FUNCTION update_quotation_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update status_updated_at when status changes
DROP TRIGGER IF EXISTS update_quotation_status_timestamp_trigger ON quotations;
CREATE TRIGGER update_quotation_status_timestamp_trigger
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_status_timestamp();
