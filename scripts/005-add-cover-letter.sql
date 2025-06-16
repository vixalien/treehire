-- Add cover letter field to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS cover_letter_url TEXT;
