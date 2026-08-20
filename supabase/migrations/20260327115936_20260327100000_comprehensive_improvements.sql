/*
  # Comprehensive Application Improvements
  
  This migration adds support for all the new features including task templates,
  markup profiles, historical tracking, notifications, and analytics.

  ## New Tables
  
  ### `task_templates`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Creator of the template
  - `name` (text) - Template name
  - `description` (text) - Template description
  - `category` (text) - Category for organization
  - `template_data` (jsonb) - Stored task configuration
  - `is_public` (boolean) - Whether visible to all users
  - `usage_count` (integer) - Track how often used
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `markup_profiles`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Owner
  - `name` (text) - Profile name
  - `description` (text) - Profile description
  - `is_default` (boolean) - Default profile for user
  - `admin_markup` (numeric) - Admin markup percentage
  - `consumables_markup` (numeric) - Consumables markup
  - `materials_markup` (numeric) - Materials markup
  - `subcontractor_markup` (numeric) - Subcontractor markup
  - `lab_testing_markup` (numeric) - Lab testing markup
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `labour_rate_history`
  - `id` (uuid, primary key)
  - `labour_rate_id` (uuid, references standard_labour_rates)
  - `previous_rate` (numeric) - Old rate
  - `new_rate` (numeric) - New rate
  - `changed_by` (uuid, references profiles) - Who made the change
  - `change_reason` (text) - Reason for change
  - `changed_at` (timestamptz)
  
  ### `proposal_analytics`
  - `id` (uuid, primary key)
  - `proposal_id` (uuid, references maintenance_proposals)
  - `total_value` (numeric) - Total proposal value
  - `labour_cost` (numeric) - Total labour cost
  - `materials_cost` (numeric) - Total materials cost
  - `profit_margin` (numeric) - Calculated margin percentage
  - `task_count` (integer) - Number of tasks
  - `calculated_at` (timestamptz)
  
  ### `user_notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Recipient
  - `notification_type` (text) - Type of notification
  - `title` (text) - Notification title
  - `message` (text) - Notification message
  - `link_url` (text) - Optional link
  - `read_at` (timestamptz) - When read
  - `created_at` (timestamptz)
  - `related_entity_type` (text) - Entity type (proposal, quotation, etc.)
  - `related_entity_id` (uuid) - Entity ID
  
  ### `proposal_comments`
  - `id` (uuid, primary key)
  - `proposal_id` (uuid, references maintenance_proposals)
  - `user_id` (uuid, references auth.users) - Commenter
  - `comment_text` (text) - Comment content
  - `is_internal` (boolean) - Internal note (not shown to client)
  - `mentions` (text[]) - Mentioned user IDs
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `approval_workflows`
  - `id` (uuid, primary key)
  - `proposal_id` (uuid, references maintenance_proposals)
  - `requester_id` (uuid, references auth.users) - Who requested approval
  - `approver_id` (uuid, references auth.users) - Who needs to approve
  - `status` (text) - pending, approved, rejected
  - `notes` (text) - Approval notes
  - `requested_at` (timestamptz)
  - `responded_at` (timestamptz)
  
  ### `client_portal_access`
  - `id` (uuid, primary key)
  - `proposal_id` (uuid, references maintenance_proposals)
  - `access_token` (uuid, unique) - Secure access token
  - `client_email` (text) - Client email
  - `client_name` (text) - Client name
  - `expires_at` (timestamptz) - When access expires
  - `viewed_at` (timestamptz) - When first viewed
  - `accepted_at` (timestamptz) - When accepted
  - `signature_data` (text) - Digital signature
  - `created_by` (uuid, references auth.users)
  - `created_at` (timestamptz)

  ## Security
  - All tables have RLS enabled
  - Policies restrict access to authenticated users
  - Users can only see their own data or public/shared data
*/

-- Task Templates Table
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'General',
  template_data jsonb NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates or their own"
  ON task_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON task_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON task_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON task_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Markup Profiles Table
CREATE TABLE IF NOT EXISTS markup_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_default boolean DEFAULT false,
  admin_markup numeric DEFAULT 0,
  consumables_markup numeric DEFAULT 0,
  materials_markup numeric DEFAULT 0,
  subcontractor_markup numeric DEFAULT 0,
  lab_testing_markup numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE markup_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own markup profiles"
  ON markup_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own markup profiles"
  ON markup_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own markup profiles"
  ON markup_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own markup profiles"
  ON markup_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Labour Rate History Table
CREATE TABLE IF NOT EXISTS labour_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_rate_id uuid REFERENCES standard_labour_rates(id),
  previous_rate numeric NOT NULL,
  new_rate numeric NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  change_reason text DEFAULT '',
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE labour_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rate history"
  ON labour_rate_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert rate history"
  ON labour_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Proposal Analytics Table
CREATE TABLE IF NOT EXISTS proposal_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES maintenance_proposals(id) ON DELETE CASCADE,
  total_value numeric DEFAULT 0,
  labour_cost numeric DEFAULT 0,
  materials_cost numeric DEFAULT 0,
  profit_margin numeric DEFAULT 0,
  task_count integer DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id)
);

ALTER TABLE proposal_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their proposals"
  ON proposal_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Analytics are automatically managed"
  ON proposal_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Analytics can be updated by proposal owner"
  ON proposal_analytics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
  );

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link_url text DEFAULT '',
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  related_entity_type text DEFAULT '',
  related_entity_id uuid
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Proposal Comments Table
CREATE TABLE IF NOT EXISTS proposal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES maintenance_proposals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  comment_text text NOT NULL,
  is_internal boolean DEFAULT true,
  mentions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible proposals"
  ON proposal_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_proposal_shares
      WHERE proposal_id = proposal_comments.proposal_id
      AND shared_with_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can create comments on accessible proposals"
  ON proposal_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM maintenance_proposal_shares
      WHERE proposal_id = proposal_comments.proposal_id
      AND shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON proposal_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON proposal_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Approval Workflows Table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES maintenance_proposals(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES auth.users(id) NOT NULL,
  approver_id uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text DEFAULT '',
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows for their proposals or where they're approver"
  ON approval_workflows FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = approver_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can create approval requests for their proposals"
  ON approval_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can update approval status"
  ON approval_workflows FOR UPDATE
  TO authenticated
  USING (auth.uid() = approver_id)
  WITH CHECK (auth.uid() = approver_id);

-- Client Portal Access Table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES maintenance_proposals(id) ON DELETE CASCADE,
  access_token uuid UNIQUE DEFAULT gen_random_uuid(),
  client_email text NOT NULL,
  client_name text NOT NULL,
  expires_at timestamptz NOT NULL,
  viewed_at timestamptz,
  accepted_at timestamptz,
  signature_data text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their client portal links"
  ON client_portal_access FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create portal access for their proposals"
  ON client_portal_access FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM maintenance_proposals
      WHERE id = proposal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Portal access can be updated by creator"
  ON client_portal_access FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_public ON task_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_markup_profiles_user_id ON markup_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_labour_rate_history_rate_id ON labour_rate_history(labour_rate_id);
CREATE INDEX IF NOT EXISTS idx_proposal_analytics_proposal_id ON proposal_analytics(proposal_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON user_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_proposal_id ON approval_workflows(proposal_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_approver_id ON approval_workflows(approver_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_proposal_id ON client_portal_access(proposal_id);
