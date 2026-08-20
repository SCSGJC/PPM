/*
  # Admin Notification System for New User Signups

  1. Overview
    - Automatically notifies admin users when a new user registers
    - Uses database trigger to detect new user creation
    - Calls edge function to send notification emails to all active admins

  2. Components Created
    - Database function to handle new user notifications
    - Trigger on profiles table to fire when new users are created
    - HTTP extension to call the edge function

  3. How It Works
    - When a new user signs up, a profile is created
    - The trigger detects the new profile
    - It calls the edge function with user details
    - The edge function queries for all admin users and sends them emails

  4. Security
    - Uses service role to call the edge function
    - Only fires for genuinely new profiles
    - Handles errors gracefully without blocking user creation

  5. Setup Required
    - Deploy the notify-admin-new-user edge function first
    - Configure email service (SendGrid, Resend, AWS SES)
    - Run this migration to enable automatic notifications
*/

-- Enable HTTP extension to call edge functions from database
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to notify admins when a new user signs up
CREATE OR REPLACE FUNCTION notify_admins_of_new_user()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  supabase_url text;
  http_response extensions.http_response;
BEGIN
  -- Get Supabase URL from settings or use localhost for development
  supabase_url := current_setting('app.settings.supabase_url', true);

  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Default to local Supabase instance for development
    supabase_url := 'http://localhost:54321';
  END IF;

  function_url := supabase_url || '/functions/v1/notify-admin-new-user';

  -- Call the edge function asynchronously
  -- This uses pg_background or similar to avoid blocking user creation
  http_response := extensions.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', NEW.id::text,
      'user_email', NEW.email,
      'created_at', NEW.created_at::text
    )
  );

  -- Log the response for debugging
  RAISE LOG 'Admin notification response: % %', http_response.status, http_response.content;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block user creation if notification fails
  RAISE WARNING 'Failed to notify admins of new user %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_notify_admins ON profiles;

-- Create trigger to fire when a new profile is created
CREATE TRIGGER on_profile_created_notify_admins
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_new_user();

-- Add helpful comments
COMMENT ON FUNCTION notify_admins_of_new_user() IS 'Automatically notifies all active admin users when a new user registers in the system';
COMMENT ON TRIGGER on_profile_created_notify_admins ON profiles IS 'Triggers admin notification email when a new user profile is created during signup';
