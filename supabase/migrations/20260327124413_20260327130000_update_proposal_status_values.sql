/*
  # Update Proposal Status Values

  1. Changes
    - Update proposal_status constraint to allow: 'draft', 'issued', 'won', 'lost'
    - Remove old constraint and add new one
    - Set default value to 'draft' instead of 'issued'

  2. Important Notes
    - Draft: Proposal is being worked on
    - Issued: Price has been submitted to client
    - Won: Proposal was accepted by client
    - Lost: Proposal was rejected by client
*/

-- Drop the old constraint
ALTER TABLE maintenance_proposals
DROP CONSTRAINT IF EXISTS maintenance_proposals_proposal_status_check;

-- Add new constraint with updated values
ALTER TABLE maintenance_proposals
ADD CONSTRAINT maintenance_proposals_proposal_status_check
CHECK (proposal_status IN ('draft', 'issued', 'won', 'lost'));

-- Update the default value to 'draft'
ALTER TABLE maintenance_proposals
ALTER COLUMN proposal_status SET DEFAULT 'draft';