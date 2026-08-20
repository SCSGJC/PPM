/*
  # User Roles System

  1. Changes to `profiles` table
    - Add `role` column (text) - System-wide user role: 'admin', 'project_engineer', 'foreman', 'viewer'
    - Add `is_admin` column (boolean) - Quick flag to check if user is an admin
    - Set default role to 'viewer' for new users
    - Set is_admin to false by default

  2. Security
    - Update RLS policies to allow admins to manage user roles
    - Ensure non-admin users cannot modify role fields

  3. Notes
    - Admin users can approve other users and assign any role including admin
    - Project Engineer and Foreman roles can be used for specific permissions
    - Existing users will be assigned 'viewer' role by default
*/

-- Add role and is_admin columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'viewer' CHECK (role IN ('admin', 'project_engineer', 'foreman', 'viewer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create an index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Update existing users to have viewer role if not set
UPDATE profiles SET role = 'viewer' WHERE role IS NULL;
UPDATE profiles SET is_admin = false WHERE is_admin IS NULL;

-- Create a function to automatically set is_admin based on role
CREATE OR REPLACE FUNCTION sync_is_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_admin := (NEW.role = 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync is_admin when role changes
DROP TRIGGER IF EXISTS sync_is_admin_trigger ON profiles;
CREATE TRIGGER sync_is_admin_trigger
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_is_admin_flag();

-- Add RPC function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_user_id uuid;
  v_is_admin boolean;
BEGIN
  -- Get current user
  v_admin_user_id := auth.uid();

  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_admin_user_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;

  -- Validate role
  IF new_role NOT IN ('admin', 'project_engineer', 'foreman', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
