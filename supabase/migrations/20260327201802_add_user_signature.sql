/*
  # Add User Signature Storage

  1. Changes
    - Add signature_url column to profiles table for storing user signature images
    - Signature images will be stored in Supabase Storage and referenced by URL
    - This allows users to upload their signature once and have it automatically included in proposals

  2. Security
    - Column is optional (nullable) - users can choose whether to upload a signature
    - Existing RLS policies on profiles table will protect access to signature URLs
*/

-- Add signature_url column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'signature_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signature_url text;
  END IF;
END $$;

-- Create storage bucket for signatures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload their own signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload own signature'
  ) THEN
    CREATE POLICY "Users can upload own signature"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to read their own signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can read own signature'
  ) THEN
    CREATE POLICY "Users can read own signature"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to update their own signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own signature'
  ) THEN
    CREATE POLICY "Users can update own signature"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to delete their own signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own signature'
  ) THEN
    CREATE POLICY "Users can delete own signature"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'signatures' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow public read access for signatures (needed for PDF generation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can view signatures'
  ) THEN
    CREATE POLICY "Public can view signatures"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'signatures');
  END IF;
END $$;