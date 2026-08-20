/*
  # Fix Component Library RLS Policies for Anonymous Access

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Add new policies that allow anonymous (anon role) access
    - Allow anyone to read all components
    - Allow anyone to insert, update, and delete components

  2. Notes
    - This app doesn't use authentication, so we need to allow anonymous access
    - The anon key is used for all database operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read shared components" ON shared_components;
DROP POLICY IF EXISTS "Users can insert components" ON shared_components;
DROP POLICY IF EXISTS "Users can update own components" ON shared_components;
DROP POLICY IF EXISTS "Users can delete own components" ON shared_components;

-- Create new policies for anonymous access

-- Policy: Anyone (including anonymous users) can read all components
CREATE POLICY "Public can read shared components"
  ON shared_components
  FOR SELECT
  USING (true);

-- Policy: Anyone (including anonymous users) can insert components
CREATE POLICY "Public can insert components"
  ON shared_components
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone (including anonymous users) can update components
CREATE POLICY "Public can update components"
  ON shared_components
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone (including anonymous users) can delete components
CREATE POLICY "Public can delete components"
  ON shared_components
  FOR DELETE
  USING (true);
