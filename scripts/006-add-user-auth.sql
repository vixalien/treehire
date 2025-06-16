-- Enable Row Level Security on interviews table
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Add user_id column to interviews table to track who created each interview
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create policy to allow users to only see their own interviews
CREATE POLICY "Users can view own interviews" ON interviews
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own interviews
CREATE POLICY "Users can insert own interviews" ON interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own interviews
CREATE POLICY "Users can update own interviews" ON interviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own interviews
CREATE POLICY "Users can delete own interviews" ON interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy for questions (users can access questions for their interviews)
CREATE POLICY "Users can access questions for own interviews" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM interviews 
      WHERE interviews.id = questions.interview_id 
      AND interviews.user_id = auth.uid()
    )
  );

-- Enable RLS on responses table
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create policy for responses (users can access responses for their interviews)
CREATE POLICY "Users can access responses for own interviews" ON responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM interviews 
      JOIN questions ON questions.interview_id = interviews.id
      WHERE questions.id = responses.question_id 
      AND interviews.user_id = auth.uid()
    )
  );

-- Enable RLS on transcripts table
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create policy for transcripts (users can access transcripts for their interviews)
CREATE POLICY "Users can access transcripts for own interviews" ON transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM interviews 
      WHERE interviews.id = transcripts.interview_id 
      AND interviews.user_id = auth.uid()
    )
  );

-- Create a profiles table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  company TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
