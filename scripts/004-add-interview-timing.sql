-- Add timing fields to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Update existing interviews to have start_time as created_at for now
UPDATE interviews 
SET start_time = created_at 
WHERE start_time IS NULL;
