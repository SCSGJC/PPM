/*
  # Create Signatures Storage Bucket

  1. Storage
    - Creates a 'signatures' storage bucket for user signature images
    - Sets bucket to public for easy access in PDFs
    - Adds RLS policies for secure upload/access
  
  2. Security
    - Users can only upload to their own folder (user_id/)
    - Users can only delete their own signatures
    - Public read access for displaying in reports
*/

-- Create the signatures bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own signatures
CREATE POLICY "Users can upload their own signature"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own signatures
CREATE POLICY "Users can update their own signature"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own signatures
CREATE POLICY "Users can delete their own signature"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all signatures (for PDF generation)
CREATE POLICY "Public read access for signatures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'signatures');