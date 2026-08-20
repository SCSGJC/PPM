/*
  # Component Library Schema

  1. New Tables
    - `shared_components`
      - `id` (uuid, primary key)
      - `category` (text) - Component category (e.g., Plumbing, Electrical)
      - `name` (text) - Component name
      - `description` (text) - Detailed description
      - `default_qty` (numeric) - Default quantity
      - `default_hours` (numeric) - Default labour hours
      - `default_materials` (numeric) - Default materials cost
      - `default_subcontractor` (numeric) - Default subcontractor cost
      - `default_labour_type` (text) - Default labour type
      - `default_band` (text) - Default band (R1/R2/R3)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `shared_components` table
    - Add policies for public access (no authentication required)

  3. Notes
    - Components can be shared across all users
    - No authentication required - public access for all operations
*/

-- Create shared_components table
CREATE TABLE IF NOT EXISTS shared_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  default_qty numeric NOT NULL DEFAULT 1,
  default_hours numeric NOT NULL DEFAULT 0,
  default_materials numeric NOT NULL DEFAULT 0,
  default_subcontractor numeric NOT NULL DEFAULT 0,
  default_labour_type text NOT NULL DEFAULT 'Builder',
  default_band text NOT NULL DEFAULT 'R1' CHECK (default_band IN ('R1', 'R2', 'R3')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shared_components_category ON shared_components(category);

-- Enable RLS
ALTER TABLE shared_components ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read all shared components
CREATE POLICY "Public can read shared components"
  ON shared_components
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert components
CREATE POLICY "Public can insert components"
  ON shared_components
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update components
CREATE POLICY "Public can update components"
  ON shared_components
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete components
CREATE POLICY "Public can delete components"
  ON shared_components
  FOR DELETE
  USING (true);

-- Insert default professional components
INSERT INTO shared_components (category, name, description, default_qty, default_hours, default_materials, default_subcontractor, default_labour_type, default_band) VALUES
  -- Plumbing Components
  ('Plumbing', 'Standard Toilet Installation', 'Supply and install standard close-coupled toilet suite including cistern, pan, seat, and all fittings', 1, 3.5, 180, 0, 'Plumber', 'R1'),
  ('Plumbing', 'Basin and Taps Installation', 'Supply and install wall-hung basin with mixer taps, waste, and all connections', 1, 2.5, 120, 0, 'Plumber', 'R1'),
  ('Plumbing', 'Radiator Installation', 'Supply and install standard panel radiator including TRV, lockshield valve, and connections', 1, 2.0, 85, 0, 'Plumber', 'R1'),

  -- Electrical Components
  ('Electrical', 'Light Switch Installation', 'Supply and install single gang 2-way light switch including back box and connections', 1, 0.75, 12, 0, 'Electrician', 'R1'),
  ('Electrical', 'Socket Outlet Installation', 'Supply and install 13A twin socket outlet including back box, cable, and testing', 1, 1.0, 18, 0, 'Electrician', 'R1'),

  -- Building Components
  ('Building', 'Stud Wall Construction', 'Construct timber stud partition wall including studs, noggins, plasterboard both sides, and finishing', 1, 4.5, 35, 0, 'Builder', 'R1'),
  ('Building', 'Internal Door Hanging', 'Hang internal door including hinges, handle, lock, and adjustments to frame', 1, 2.5, 15, 0, 'Joiner', 'R1'),

  -- HVAC Components
  ('HVAC', 'Ductwork Installation', 'Supply and install flexible ductwork including supports, connections, and insulation per linear meter', 1, 0.5, 8, 0, 'Ventilation', 'R1')
ON CONFLICT DO NOTHING;
