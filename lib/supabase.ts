import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Interview = {
  id: string
  title: string
  candidate_name: string
  position: string
  resume_url?: string
  job_requirements_url?: string
  status: "draft" | "in_progress" | "completed"
  created_at: string
  updated_at: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  interviewer_notes?: string
  final_score?: number
  gaps_analysis?: string
  training_needs?: string
  overall_assessment?: string
  strengths?: string
  weaknesses?: string
  recommendation?: string
  confidence_score?: number
}

export type Question = {
  id: string
  interview_id: string
  question_text: string
  question_type: "generated" | "custom"
  order_index: number
  created_at: string
}

export type Response = {
  id: string
  question_id: string
  answer_text?: string
  score?: number
  notes?: string
  created_at: string
  updated_at: string
}

export type Transcript = {
  id: string
  interview_id: string
  transcript_text: string
  timestamp_start: string
  speaker: "interviewer" | "candidate"
  created_at: string
}
