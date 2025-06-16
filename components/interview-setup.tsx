"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "./file-upload"
import { generateQuestions } from "@/lib/openrouter"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function InterviewSetup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    candidateName: "",
    position: "",
    customQuestions: "",
  })
  const [resumeContent, setResumeContent] = useState("")
  const [jobRequirementsContent, setJobRequirementsContent] = useState("")
  const [resumeUrl, setResumeUrl] = useState("")
  const [jobRequirementsUrl, setJobRequirementsUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create interview record
      const { data: interview, error: interviewError } = await supabase
        .from("interviews")
        .insert({
          title: formData.title,
          candidate_name: formData.candidateName,
          position: formData.position,
          resume_url: resumeUrl,
          job_requirements_url: jobRequirementsUrl,
          status: "draft",
        })
        .select()
        .single()

      if (interviewError) throw interviewError

      // Generate questions using AI
      const customQuestionsArray = formData.customQuestions
        .split("\n")
        .filter((q) => q.trim())
        .map((q) => q.trim())

      const { questions } = await generateQuestions(resumeContent, jobRequirementsContent, customQuestionsArray)

      // Save generated questions
      const questionsToInsert = [
        ...questions.map((q: any, index: number) => ({
          interview_id: interview.id,
          question_text: q.question,
          question_type: "generated",
          order_index: index,
        })),
        ...customQuestionsArray.map((q: string, index: number) => ({
          interview_id: interview.id,
          question_text: q,
          question_type: "custom",
          order_index: questions.length + index,
        })),
      ]

      const { error: questionsError } = await supabase.from("questions").insert(questionsToInsert)

      if (questionsError) throw questionsError

      // Navigate to interview page
      router.push(`/interview/${interview.id}`)
    } catch (error) {
      console.error("Error creating interview:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Setup New Interview</CardTitle>
          <CardDescription>Upload documents and configure your interview session</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Interview Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Frontend Developer Interview"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name</Label>
                <Input
                  id="candidateName"
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Senior Frontend Developer"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Resume Upload</Label>
                <FileUpload
                  onFileUploaded={(url, content) => {
                    setResumeUrl(url)
                    setResumeContent(content)
                  }}
                  accept=".pdf,.docx,.doc,.txt"
                  label="Upload candidate resume"
                />
              </div>
              <div className="space-y-2">
                <Label>Job Requirements</Label>
                <FileUpload
                  onFileUploaded={(url, content) => {
                    setJobRequirementsUrl(url)
                    setJobRequirementsContent(content)
                  }}
                  accept=".pdf,.docx,.doc,.txt"
                  label="Upload job requirements"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customQuestions">Custom Questions (Optional)</Label>
              <Textarea
                id="customQuestions"
                value={formData.customQuestions}
                onChange={(e) => setFormData({ ...formData, customQuestions: e.target.value })}
                placeholder="Enter custom questions, one per line..."
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !resumeContent || !jobRequirementsContent}>
              {loading ? "Setting up interview..." : "Create Interview & Generate Questions"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
