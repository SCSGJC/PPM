/*
  # Shared Components Library

  1. New Tables
    - `shared_components` - Shared component library items
      - `id` (uuid, primary key)
      - `category` (text)
      - `name` (text)
      - `description` (text)
      - `default_qty` (numeric)
      - `default_hours` (numeric)
      - `default_materials` (numeric)
      - `default_subcontractor` (numeric)
      - `default_labour_type` (text)
      - `default_band` (text)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_public` (boolean) - Whether component is visible to all users

  2. Security
    - Enable RLS on shared_components table
    - Add policies for reading public components
    - Add policies for managing own components
*/

-- Shared components table
CREATE TABLE IF NOT EXISTS shared_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  default_qty numeric NOT NULL DEFAULT 1,
  default_hours numeric NOT NULL DEFAULT 0,
  default_materials numeric NOT NULL DEFAULT 0,
  default_subcontractor numeric NOT NULL DEFAULT 0,
  default_labour_type text NOT NULL DEFAULT 'Builder',
  default_band text NOT NULL DEFAULT 'R1' CHECK (default_band IN ('R1', 'R2', 'R3')),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true
);

ALTER TABLE shared_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_components
CREATE POLICY "Users can read public components"
  ON shared_components
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can read their own components"
  ON shared_components
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create components"
  ON shared_components
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own components"
  ON shared_components
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own components"
  ON shared_components
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_components_category ON shared_components(category);
CREATE INDEX IF NOT EXISTS idx_shared_components_created_by ON shared_components(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_components_is_public ON shared_components(is_public);
CREATE INDEX IF NOT EXISTS idx_shared_components_name ON shared_components(name);

-- Trigger for updated_at
CREATE TRIGGER update_shared_components_updated_at
  BEFORE UPDATE ON shared_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();