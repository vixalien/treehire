-- Alternative script to create storage bucket if the first one doesn't work
-- This can be run separately if needed

-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create the interview-files bucket
DO $$
BEGIN
    -- Insert bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'interview-files',
        'interview-files', 
        true,
        10485760, -- 10MB limit
        ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Bucket creation failed or already exists: %', SQLERRM;
END $$;

-- Create RLS policies for the storage bucket
DO $$
BEGIN
    -- Policy for uploads (authenticated users)
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT 
    WITH CHECK (bucket_id = 'interview-files');

    -- Policy for downloads (public access)
    CREATE POLICY "Allow public downloads" ON storage.objects
    FOR SELECT 
    USING (bucket_id = 'interview-files');

    -- Policy for updates (authenticated users)
    CREATE POLICY "Allow authenticated updates" ON storage.objects
    FOR UPDATE 
    USING (bucket_id = 'interview-files');

    -- Policy for deletes (authenticated users)
    CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE 
    USING (bucket_id = 'interview-files');

EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policies already exist';
    WHEN others THEN
        RAISE NOTICE 'Policy creation failed: %', SQLERRM;
END $$;
