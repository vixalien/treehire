# 🌳 Treehire - AI-Powered Interview Assistant

A comprehensive interview management application that uses AI to generate questions, record live transcripts, and provide detailed candidate analysis with precise timing tracking.

## Features

- **Smart Question Generation**: AI-powered questions based on resume and job requirements
- **Interview Timing**: Precise start/end time tracking with duration calculation
- **Live Transcription**: Real-time speech-to-text during interviews
- **Scoring System**: Rate candidate responses on a 1-10 scale with validation
- **AI Analysis**: Comprehensive candidate evaluation with strengths, weaknesses, and recommendations
- **File Management**: Upload and process PDF, DOCX, and TXT files
- **Interview Dashboard**: Manage multiple interview sessions with timing information

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- OpenRouter API key

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 2. Database Setup

Run the following SQL scripts in your Supabase SQL Editor in order:

#### Main Tables Setup (`scripts/001-create-tables.sql`):

```sql
-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  resume_url TEXT,
  job_requirements_url TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  interviewer_notes TEXT,
  final_score DECIMAL(3,1),
  gaps_analysis TEXT,
  training_needs TEXT
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'generated',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  timestamp_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  speaker VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_interview_id ON questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_interview_id ON transcripts(interview_id);
```

#### Storage Setup (`scripts/002-setup-storage.sql`):

```sql
-- Create storage bucket for interview files
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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'interview-files');

CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'interview-files');

CREATE POLICY "Allow public updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'interview-files');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'interview-files');
```

#### Enhanced Analysis Fields (`scripts/003-update-interviews-table.sql`):

```sql
-- Add additional fields to store complete analysis
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS overall_assessment TEXT,
ADD COLUMN IF NOT EXISTS strengths TEXT,
ADD COLUMN IF NOT EXISTS weaknesses TEXT,
ADD COLUMN IF NOT EXISTS recommendation VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
```

#### Interview Timing (`scripts/004-add-interview-timing.sql`):

```sql
-- Add timing fields to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Update existing interviews to have start_time as created_at for now
UPDATE interviews 
SET start_time = created_at 
WHERE start_time IS NULL;
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Run the Application

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to start using Treehire.

## Usage

### Creating an Interview

1. **Setup Interview**: Fill in interview details (title, candidate name, position)
2. **Upload Files**: Upload candidate resume and job requirements (PDF, DOCX, TXT)
3. **Add Custom Questions**: Optionally add your own questions
4. **Generate Questions**: AI will create relevant questions based on the documents

### Conducting an Interview

1. **Start Interview**: Click "Start Interview" to begin timing
2. **Live Transcript**: Enable speech-to-text recording
3. **Question Navigation**: Move through questions with Previous/Next buttons
4. **Record Answers**: Type candidate responses or use live transcript
5. **Score Responses**: Rate each answer on a 0-10 scale (with validation)
6. **Add Notes**: Include additional observations
7. **Generate Analysis**: Get AI-powered candidate evaluation with timing data

### Managing Interviews

- **Dashboard**: View all interviews with status, scores, and duration
- **Review**: Access completed interviews and their analysis
- **Reports**: View detailed candidate assessments with timing information
- **Delete**: Remove interviews with confirmation dialogs

## Key Features

### Interview Timing
- **Start Time**: Precisely recorded when interview begins
- **End Time**: Automatically set when analysis is completed
- **Duration**: Calculated and displayed in minutes/hours
- **Status Tracking**: Draft → In Progress → Completed

### Score Validation
- **Range Validation**: Ensures scores are between 0-10
- **Real-time Feedback**: Immediate validation with visual indicators
- **Decimal Support**: Allows precise scoring (e.g., 7.5)
- **Navigation Prevention**: Blocks progression with invalid scores

### Enhanced UI
- **Tree Theme**: Green color scheme with tree emoji (🌳)
- **Timing Display**: Shows start time, duration, and status
- **Better Feedback**: Toast notifications for all actions
- **Improved Navigation**: Clear status indicators and progress tracking

## API Endpoints

- `POST /api/generate-questions` - Generate AI questions from documents
- `POST /api/analyze-interview` - Generate comprehensive interview analysis

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
