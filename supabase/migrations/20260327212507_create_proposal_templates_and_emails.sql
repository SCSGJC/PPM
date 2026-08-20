/*
  # Create Proposal Templates and Email Tracking Tables

  1. New Tables
    - `proposal_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `template_name` (text) - Name of the template
      - `description` (text) - Description of what this template is for
      - `category` (text) - Category for organizing templates
      - `template_data` (jsonb) - The actual proposal data to use as template
      - `is_public` (boolean) - If true, visible to all users
      - `usage_count` (integer) - Track how many times template has been used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `maintenance_proposal_emails`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, references maintenance_proposals)
      - `sent_by` (uuid, references auth.users)
      - `recipient_email` (text) - Email address of recipient
      - `recipient_name` (text) - Name of recipient
      - `email_type` (text) - Type: proposal, reminder, follow_up
      - `subject` (text) - Email subject line
      - `message` (text) - Email message body
      - `sent_at` (timestamptz) - When email was sent
      - `opened_at` (timestamptz) - When recipient opened email
      - `acceptance_token` (uuid) - Unique token for tracking
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view their own templates and public templates
    - Users can manage their own templates
    - Admins can make templates public
    - Users can view email history for proposals they own or have access to

  3. Indexes
    - Index on template category and user_id for fast lookups
    - Index on proposal_id for email history
    - Index on acceptance_token for tracking
*/

-- Create proposal_templates table
CREATE TABLE IF NOT EXISTS proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  template_data jsonb NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_proposal_emails table
CREATE TABLE IF NOT EXISTS maintenance_proposal_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES maintenance_proposals(id) ON DELETE CASCADE NOT NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text DEFAULT '',
  email_type text DEFAULT 'proposal' CHECK (email_type IN ('proposal', 'reminder', 'follow_up', 'acceptance')),
  subject text NOT NULL,
  message text DEFAULT '',
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  acceptance_token uuid DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_templates_user_id ON proposal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_category ON proposal_templates(category);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_is_public ON proposal_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposal_emails_proposal_id ON maintenance_proposal_emails(proposal_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_proposal_emails_acceptance_token ON maintenance_proposal_emails(acceptance_token);

-- Enable RLS
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_proposal_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_templates

-- Users can view their own templates and public templates
CREATE POLICY "Users can view own and public templates"
  ON proposal_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

-- Users can insert their own templates
CREATE POLICY "Users can create own templates"
  ON proposal_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON proposal_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON proposal_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for maintenance_proposal_emails

-- Users can view emails for proposals they own or have shared access to
CREATE POLICY "Users can view proposal emails"
  ON maintenance_proposal_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_proposals mp
      WHERE mp.id = maintenance_proposal_emails.proposal_id
      AND (
        mp.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM maintenance_proposal_shares mps
          WHERE mps.proposal_id = mp.id
          AND mps.shared_with_user_id = auth.uid()
        )
      )
    )
  );

-- Users can send emails for proposals they own
CREATE POLICY "Users can send proposal emails"
  ON maintenance_proposal_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_proposals mp
      WHERE mp.id = proposal_id
      AND mp.user_id = auth.uid()
    )
  );

-- Users can update emails they sent
CREATE POLICY "Users can update own emails"
  ON maintenance_proposal_emails FOR UPDATE
  TO authenticated
  USING (sent_by = auth.uid())
  WITH CHECK (sent_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_proposal_templates_updated_at ON proposal_templates;
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_proposal_emails_updated_at ON maintenance_proposal_emails;
CREATE TRIGGER update_maintenance_proposal_emails_updated_at
  BEFORE UPDATE ON maintenance_proposal_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
