/*
  # Admin Access to All Quotations

  1. Changes
    - Add RLS policy to allow admins to view all quotations
    - Add RLS policy to allow admins to view all user profiles
    - Ensure admins can manage quotations across the system

  2. Security
    - Only users with is_admin = true can access all quotations
    - Regular users still only see their own quotations
    - Admins can view but not modify other users' quotations without proper authorization

  3. Notes
    - This enables admin oversight and reporting capabilities
    - User filter functionality can now work for admins
*/

-- Add policy for admins to view all quotations
CREATE POLICY "Admins can view all quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add policy for admins to view all user profiles (needed for user filter)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );
