-- Add additional fields to store complete analysis
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS overall_assessment TEXT,
ADD COLUMN IF NOT EXISTS strengths TEXT,
ADD COLUMN IF NOT EXISTS weaknesses TEXT,
ADD COLUMN IF NOT EXISTS recommendation VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Update existing interviews to have proper status
UPDATE interviews SET status = 'completed' WHERE final_score IS NOT NULL;
