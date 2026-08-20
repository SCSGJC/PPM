/*
  # Labour Rates Table

  1. New Tables
    - `labour_rates`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - User who owns this rate
      - `name` (text) - Labour rate name (e.g., "Builder", "Electrician", "Plumber")
      - `base_rate` (numeric) - Base hourly rate in pounds
      - `is_default` (boolean) - Whether this is a default rate for the user
      - `display_order` (integer) - Order for display in dropdowns
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `labour_rates` table
    - Users can only view and manage their own labour rates
    - Add policies for authenticated users

  3. Default Data
    - Insert common labour rate templates
*/

-- Create labour_rates table
CREATE TABLE IF NOT EXISTS labour_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  base_rate numeric NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labour_rates_user_id ON labour_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_labour_rates_display_order ON labour_rates(display_order);

-- Enable Row Level Security
ALTER TABLE labour_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own labour rates
CREATE POLICY "Users can view own labour rates"
  ON labour_rates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own labour rates
CREATE POLICY "Users can insert own labour rates"
  ON labour_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own labour rates
CREATE POLICY "Users can update own labour rates"
  ON labour_rates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own labour rates
CREATE POLICY "Users can delete own labour rates"
  ON labour_rates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_labour_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_labour_rates_updated_at_trigger ON labour_rates;
CREATE TRIGGER update_labour_rates_updated_at_trigger
  BEFORE UPDATE ON labour_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_labour_rates_updated_at();
