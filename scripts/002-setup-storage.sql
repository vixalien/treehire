-- This script should be run in the Supabase SQL Editor with admin privileges
-- It creates the storage bucket and sets up the necessary policies

-- Create the storage bucket (this must be done with admin privileges)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-files',
  'interview-files',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Create storage policies that allow public access for interview files
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'interview-files');

CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'interview-files');

CREATE POLICY "Allow public updates" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'interview-files');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'interview-files');
