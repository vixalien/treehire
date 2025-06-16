"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "./file-upload"
import { generateQuestions } from "@/lib/openrouter"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, FileText, User, Loader2 } from "lucide-react"

export function InterviewSetup() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: "",
    candidateName: "",
    position: "",
    customQuestions: "",
  })

  // Document content states
  const [resumeContent, setResumeContent] = useState("")
  const [jobRequirementsContent, setJobRequirementsContent] = useState("")
  const [coverLetterContent, setCoverLetterContent] = useState("")

  // Document URL states
  const [resumeUrl, setResumeUrl] = useState("")
  const [jobRequirementsUrl, setJobRequirementsUrl] = useState("")
  const [coverLetterUrl, setCoverLetterUrl] = useState("")

  // Document file names for display
  const [resumeFileName, setResumeFileName] = useState("")
  const [jobRequirementsFileName, setJobRequirementsFileName] = useState("")
  const [coverLetterFileName, setCoverLetterFileName] = useState("")

  // Input method states
  const [resumeInputMethod, setResumeInputMethod] = useState<"upload" | "paste">("upload")
  const [jobRequirementsInputMethod, setJobRequirementsInputMethod] = useState<"upload" | "paste">("upload")

  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [hasExtracted, setHasExtracted] = useState(false)

  const extractInformation = async () => {
    if (!resumeContent || !jobRequirementsContent || hasExtracted) return

    setExtracting(true)
    try {
      toast({
        title: "Analyzing Documents",
        description: "AI is extracting key information to pre-fill interview details...",
      })

      const response = await fetch("/api/extract-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: resumeContent,
          jobRequirements: jobRequirementsContent,
        }),
      })

      if (response.ok) {
        const { candidateName, position, title } = await response.json()

        const updatedFields = []
        if (candidateName && candidateName.trim() && !formData.candidateName) {
          setFormData((prev) => ({ ...prev, candidateName: candidateName.trim() }))
          updatedFields.push("candidate name")
        }
        if (position && position.trim() && !formData.position) {
          setFormData((prev) => ({ ...prev, position: position.trim() }))
          updatedFields.push("position")
        }
        if (title && title.trim() && !formData.title) {
          setFormData((prev) => ({ ...prev, title: title.trim() }))
          updatedFields.push("interview title")
        }

        setHasExtracted(true)

        if (updatedFields.length > 0) {
          toast({
            title: "Details Pre-filled",
            description: `Successfully extracted: ${updatedFields.join(", ")}. You can edit these before creating the interview.`,
          })
        } else {
          toast({
            title: "Analysis Complete",
            description: "Documents analyzed. Please fill in the interview details manually.",
          })
        }
      } else {
        throw new Error("Failed to extract information")
      }
    } catch (error) {
      console.error("Error extracting information:", error)
      toast({
        title: "Extraction Failed",
        description: "Could not auto-extract information. Please fill in details manually.",
        variant: "destructive",
      })
    } finally {
      setExtracting(false)
    }
  }

  const handleDocumentContent = (
    type: "resume" | "jobRequirements" | "coverLetter",
    url: string,
    content: string,
    fileName?: string,
  ) => {
    if (type === "resume") {
      setResumeUrl(url)
      setResumeContent(content)
      if (fileName) setResumeFileName(fileName)
    } else if (type === "jobRequirements") {
      setJobRequirementsUrl(url)
      setJobRequirementsContent(content)
      if (fileName) setJobRequirementsFileName(fileName)
    } else if (type === "coverLetter") {
      setCoverLetterUrl(url)
      setCoverLetterContent(content)
      if (fileName) setCoverLetterFileName(fileName)
    }
  }

  const handleTextInput = (type: "resume" | "jobRequirements", content: string) => {
    if (type === "resume") {
      setResumeContent(content)
      setResumeUrl("")
      setResumeFileName("")
    } else if (type === "jobRequirements") {
      setJobRequirementsContent(content)
      setJobRequirementsUrl("")
      setJobRequirementsFileName("")
    }
  }

  const handleContinueToDetails = async () => {
    // First extract information, then move to step 2
    if (resumeContent && jobRequirementsContent && !hasExtracted) {
      await extractInformation()
    }
    setStep(2)
  }

  const canProceedToStep2 = resumeContent.trim() && jobRequirementsContent.trim()

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
          cover_letter_url: coverLetterUrl || null,
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

      const { questions } = await generateQuestions(
        resumeContent,
        jobRequirementsContent,
        customQuestionsArray,
        coverLetterContent,
      )

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

      toast({
        title: "Interview Created",
        description: "Interview setup complete with AI-generated questions!",
      })

      // Navigate to interview page
      router.push(`/interview/${interview.id}`)
    } catch (error) {
      console.error("Error creating interview:", error)
      toast({
        title: "Error",
        description: "Failed to create interview. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step >= 1 ? "text-green-600" : "text-gray-400"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-green-600 text-white" : "bg-gray-200"}`}
          >
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-medium">Documents</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ${step >= 2 ? "bg-green-600 w-full" : "bg-gray-200 w-0"}`}
          ></div>
        </div>
        <div className={`flex items-center space-x-2 ${step >= 2 ? "text-green-600" : "text-gray-400"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-green-600 text-white" : "bg-gray-200"}`}
          >
            <User className="h-4 w-4" />
          </div>
          <span className="font-medium">Details</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Start by providing the candidate's resume and job requirements. We'll auto-extract key information to save
              you time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resume Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Candidate Resume *</Label>
              <Tabs
                value={resumeInputMethod}
                onValueChange={(value) => setResumeInputMethod(value as "upload" | "paste")}
              >
                <TabsList className="grid w-48 grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="upload">
                  <FileUpload
                    onFileUploaded={(url, content, fileName) => handleDocumentContent("resume", url, content, fileName)}
                    accept=".pdf,.docx,.doc,.txt"
                    label="Upload candidate resume"
                    existingFile={resumeUrl ? resumeFileName || "Uploaded file" : undefined}
                    existingContent={resumeContent}
                  />
                </TabsContent>

                <TabsContent value="paste">
                  <Textarea
                    placeholder="Paste the candidate's resume content here..."
                    value={resumeContent}
                    onChange={(e) => handleTextInput("resume", e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Job Requirements Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Job Requirements *</Label>
              <Tabs
                value={jobRequirementsInputMethod}
                onValueChange={(value) => setJobRequirementsInputMethod(value as "upload" | "paste")}
              >
                <TabsList className="grid w-48 grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="upload">
                  <FileUpload
                    onFileUploaded={(url, content, fileName) =>
                      handleDocumentContent("jobRequirements", url, content, fileName)
                    }
                    accept=".pdf,.docx,.doc,.txt"
                    label="Upload job requirements"
                    existingFile={jobRequirementsUrl ? jobRequirementsFileName || "Uploaded file" : undefined}
                    existingContent={jobRequirementsContent}
                  />
                </TabsContent>

                <TabsContent value="paste">
                  <Textarea
                    placeholder="Paste the job requirements/description here..."
                    value={jobRequirementsContent}
                    onChange={(e) => handleTextInput("jobRequirements", e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Cover Letter Section (Optional) */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Cover Letter (Optional)</Label>
              <FileUpload
                onFileUploaded={(url, content, fileName) =>
                  handleDocumentContent("coverLetter", url, content, fileName)
                }
                accept=".pdf,.docx,.doc,.txt"
                label="Upload cover letter (optional)"
                existingFile={coverLetterUrl ? coverLetterFileName || "Uploaded file" : undefined}
                existingContent={coverLetterContent}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleContinueToDetails}
                disabled={!canProceedToStep2 || extracting}
                className={extracting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Documents...
                  </>
                ) : (
                  "Continue to Details"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Interview Details
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Auto-extracting information...
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Review and customize the auto-extracted information, then add any custom questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="candidateName">Candidate Name *</Label>
                  <Input
                    id="candidateName"
                    value={formData.candidateName}
                    onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Senior Frontend Developer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Interview Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Frontend Developer Interview"
                  required
                />
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
                <p className="text-sm text-gray-500">
                  Add any specific questions you want to include in addition to the AI-generated ones.
                </p>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back to Documents
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.candidateName || !formData.position || !formData.title}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Creating Interview..." : "Create Interview & Generate Questions"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Document Summary (shown in step 2) */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800">Resume</h4>
                <p className="text-sm text-green-600">
                  {resumeUrl ? `File: ${resumeFileName || "Uploaded file"}` : "Text pasted"} • {resumeContent.length}{" "}
                  characters
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800">Job Requirements</h4>
                <p className="text-sm text-blue-600">
                  {jobRequirementsUrl ? `File: ${jobRequirementsFileName || "Uploaded file"}` : "Text pasted"} •{" "}
                  {jobRequirementsContent.length} characters
                </p>
              </div>
              {coverLetterContent && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800">Cover Letter</h4>
                  <p className="text-sm text-purple-600">
                    File: {coverLetterFileName || "Uploaded file"} • {coverLetterContent.length} characters
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
