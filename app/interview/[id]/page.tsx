"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LiveTranscript } from "@/components/live-transcript"
import { supabase, type Interview, type Question, type Response } from "@/lib/supabase"
import { analyzeInterview } from "@/lib/openrouter"
import { ChevronLeft, ChevronRight, Save, BarChart3, CheckCircle, Trash2, AlertCircle, Play, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function InterviewPage() {
  const params = useParams()
  const router = useRouter()
  const interviewId = params.id as string
  const { toast } = useToast()

  const [interview, setInterview] = useState<Interview | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentResponse, setCurrentResponse] = useState({ answer: "", score: "", notes: "" })
  const [transcript, setTranscript] = useState("")
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [scoreError, setScoreError] = useState("")
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [startingInterview, setStartingInterview] = useState(false)

  useEffect(() => {
    loadInterviewData()
  }, [interviewId])

  useEffect(() => {
    // Load response for current question
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex]
      const existingResponse = responses.find((r) => r.question_id === currentQuestion.id)
      setCurrentResponse({
        answer: existingResponse?.answer_text || "",
        score: existingResponse?.score?.toString() || "",
        notes: existingResponse?.notes || "",
      })
    }
  }, [currentQuestionIndex, questions, responses])

  const loadInterviewData = async () => {
    try {
      // Load interview
      const { data: interviewData, error: interviewError } = await supabase
        .from("interviews")
        .select("*")
        .eq("id", interviewId)
        .single()

      if (interviewError) throw interviewError
      setInterview(interviewData)
      setInterviewStarted(!!interviewData.start_time && interviewData.status !== "draft")

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("interview_id", interviewId)
        .order("order_index")

      if (questionsError) throw questionsError
      setQuestions(questionsData)

      // Load existing responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("responses")
        .select("*")
        .in(
          "question_id",
          questionsData.map((q) => q.id),
        )

      if (responsesError) throw responsesError
      setResponses(responsesData)

      // Load existing analysis if available
      if (interviewData.overall_assessment || interviewData.strengths || interviewData.weaknesses) {
        setAnalysis({
          overall_assessment: interviewData.overall_assessment || "Analysis completed",
          strengths: interviewData.strengths ? interviewData.strengths.split(", ") : [],
          weaknesses: interviewData.weaknesses ? interviewData.weaknesses.split(", ") : [],
          skill_gaps: interviewData.gaps_analysis ? interviewData.gaps_analysis.split(", ") : [],
          training_recommendations: interviewData.training_needs ? interviewData.training_needs.split(", ") : [],
          cultural_fit: "Assessment completed",
          recommendation: interviewData.recommendation || "Available",
          confidence_score: interviewData.confidence_score || (interviewData.final_score || 0) / 100,
        })
      }
    } catch (error) {
      console.error("Error loading interview data:", error)
      toast({
        title: "Error",
        description: "Failed to load interview data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const startInterview = async () => {
    setStartingInterview(true)
    try {
      const startTime = new Date().toISOString()

      const { error } = await supabase
        .from("interviews")
        .update({
          start_time: startTime,
          status: "in_progress",
        })
        .eq("id", interviewId)

      if (error) throw error

      setInterview((prev) =>
        prev
          ? {
              ...prev,
              start_time: startTime,
              status: "in_progress",
            }
          : null,
      )

      setInterviewStarted(true)

      toast({
        title: "Interview Started",
        description: `Interview began at ${new Date(startTime).toLocaleTimeString()}`,
      })
    } catch (error) {
      console.error("Error starting interview:", error)
      toast({
        title: "Error",
        description: "Failed to start interview",
        variant: "destructive",
      })
    } finally {
      setStartingInterview(false)
    }
  }

  const validateScore = (score: string) => {
    const numScore = Number.parseFloat(score)
    if (score && (isNaN(numScore) || numScore < 0 || numScore > 10)) {
      setScoreError("Score must be between 0 and 10")
      return false
    }
    setScoreError("")
    return true
  }

  const handleScoreChange = (value: string) => {
    setCurrentResponse({ ...currentResponse, score: value })
    validateScore(value)
  }

  const saveResponse = async (showToast = true) => {
    if (!questions[currentQuestionIndex]) return

    // Validate score before saving
    if (!validateScore(currentResponse.score)) {
      toast({
        title: "Invalid Score",
        description: "Please enter a score between 0 and 10",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    const questionId = questions[currentQuestionIndex].id
    const existingResponse = responses.find((r) => r.question_id === questionId)

    try {
      if (existingResponse) {
        // Update existing response
        const { error } = await supabase
          .from("responses")
          .update({
            answer_text: currentResponse.answer,
            score: currentResponse.score ? Number.parseFloat(currentResponse.score) : null,
            notes: currentResponse.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id)

        if (error) throw error

        setResponses((prev) =>
          prev.map((r) =>
            r.id === existingResponse.id
              ? {
                  ...r,
                  answer_text: currentResponse.answer,
                  score: Number.parseFloat(currentResponse.score) || undefined,
                  notes: currentResponse.notes,
                }
              : r,
          ),
        )
      } else {
        // Create new response
        const { data, error } = await supabase
          .from("responses")
          .insert({
            question_id: questionId,
            answer_text: currentResponse.answer,
            score: currentResponse.score ? Number.parseFloat(currentResponse.score) : null,
            notes: currentResponse.notes,
          })
          .select()
          .single()

        if (error) throw error
        setResponses((prev) => [...prev, data])
      }

      if (showToast) {
        toast({
          title: "Response Saved",
          description: "The response has been saved successfully",
        })
      }
    } catch (error) {
      console.error("Error saving response:", error)
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const generateAnalysis = async () => {
    setAnalyzing(true)
    try {
      const { analysis } = await analyzeInterview(interview, questions, responses, transcript)
      setAnalysis(analysis)

      // Calculate average score
      const scoredResponses = responses.filter((r) => r.score !== null && r.score !== undefined)
      const averageScore =
        scoredResponses.length > 0
          ? scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0) / scoredResponses.length
          : 0

      // Calculate duration if interview has started
      const endTime = new Date().toISOString()
      const duration = interview?.start_time
        ? Math.round((new Date(endTime).getTime() - new Date(interview.start_time).getTime()) / (1000 * 60))
        : null

      // Update interview with complete analysis
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          end_time: endTime,
          duration_minutes: duration,
          overall_assessment: analysis.overall_assessment,
          strengths: analysis.strengths.join(", "),
          weaknesses: analysis.weaknesses.join(", "),
          gaps_analysis: analysis.skill_gaps.join(", "),
          training_needs: analysis.training_recommendations.join(", "),
          recommendation: analysis.recommendation,
          confidence_score: analysis.confidence_score,
          final_score: averageScore,
        })
        .eq("id", interviewId)

      // Update local interview state
      setInterview((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              end_time: endTime,
              duration_minutes: duration,
              overall_assessment: analysis.overall_assessment,
              strengths: analysis.strengths.join(", "),
              weaknesses: analysis.weaknesses.join(", "),
              gaps_analysis: analysis.skill_gaps.join(", "),
              training_needs: analysis.training_recommendations.join(", "),
              recommendation: analysis.recommendation,
              confidence_score: analysis.confidence_score,
              final_score: averageScore,
            }
          : null,
      )

      toast({
        title: "Analysis Complete",
        description: `Interview completed in ${duration} minutes. Analysis has been generated and saved.`,
      })
    } catch (error) {
      console.error("Error generating analysis:", error)
      toast({
        title: "Error",
        description: "Failed to generate analysis",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const deleteInterview = async () => {
    if (!confirm("Are you sure you want to delete this interview? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase.from("interviews").delete().eq("id", interviewId)

      if (error) throw error

      toast({
        title: "Interview Deleted",
        description: "The interview has been deleted successfully",
      })

      router.push("/interviews")
    } catch (error) {
      console.error("Error deleting interview:", error)
      toast({
        title: "Error",
        description: "Failed to delete interview",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const navigateQuestion = async (direction: "prev" | "next") => {
    // Validate and save current response first
    if (!validateScore(currentResponse.score)) {
      toast({
        title: "Invalid Score",
        description: "Please enter a valid score between 0 and 10 before continuing",
        variant: "destructive",
      })
      return
    }

    await saveResponse(false)

    if (direction === "prev" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else if (direction === "next" && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      toast({
        title: "Response Saved",
        description: "Moving to next question",
      })
    }
  }

  // Calculate average score
  const scoredResponses = responses.filter((r) => r.score !== null && r.score !== undefined)
  const averageScore =
    scoredResponses.length > 0
      ? Math.round((scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0) / scoredResponses.length) * 10)
      : 0

  // Calculate current duration
  const currentDuration = interview?.start_time
    ? Math.round((new Date().getTime() - new Date(interview.start_time).getTime()) / (1000 * 60))
    : 0

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{interview?.title}</h1>
              <p className="text-gray-600">
                {interview?.candidate_name} - {interview?.position}
              </p>
              {interview?.start_time && (
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Started: {new Date(interview.start_time).toLocaleString()}
                  {interview.status === "in_progress" && currentDuration > 0 && (
                    <span className="ml-4">Duration: {currentDuration} minutes</span>
                  )}
                  {interview.duration_minutes && interview.status === "completed" && (
                    <span className="ml-4">Total Duration: {interview.duration_minutes} minutes</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!interviewStarted && interview?.status === "draft" && (
                <Button
                  onClick={startInterview}
                  disabled={startingInterview}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {startingInterview ? "Starting..." : "Start Interview"}
                </Button>
              )}
              <Button variant="destructive" onClick={deleteInterview} disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "Deleting..." : "Delete Interview"}
              </Button>
            </div>
          </div>

          {!interviewStarted && interview?.status === "draft" && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Click "Start Interview" to begin timing and mark the interview as in progress.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Question {currentQuestionIndex + 1} of {questions.length}
            {averageScore > 0 && <span className="ml-4">Current Average Score: {averageScore}/100</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question and Response Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Current Question
                  <Badge variant={currentQuestion?.question_type === "generated" ? "default" : "secondary"}>
                    {currentQuestion?.question_type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg mb-4">{currentQuestion?.question_text}</p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="answer">Candidate Answer</Label>
                    <Textarea
                      id="answer"
                      value={currentResponse.answer}
                      onChange={(e) => setCurrentResponse({ ...currentResponse, answer: e.target.value })}
                      placeholder="Record the candidate's answer here..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="score">Score (0-10)</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={currentResponse.score}
                        onChange={(e) => handleScoreChange(e.target.value)}
                        placeholder="0-10"
                        className={scoreError ? "border-red-500" : ""}
                      />
                      {scoreError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{scoreError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={currentResponse.notes}
                        onChange={(e) => setCurrentResponse({ ...currentResponse, notes: e.target.value })}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigateQuestion("prev")}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <Button onClick={() => saveResponse()} disabled={saving || !!scoreError}>
                    {saving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Response
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => navigateQuestion("next")}
                    disabled={currentQuestionIndex === questions.length - 1 || !!scoreError}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Section */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Analysis</CardTitle>
                <CardDescription>Generate comprehensive analysis and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                {!analysis ? (
                  <Button onClick={generateAnalysis} disabled={analyzing}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {analyzing ? "Generating Analysis..." : "Generate Analysis"}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-semibold">Analysis Complete</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{averageScore}/100</div>
                        <div className="text-sm text-gray-500">Average Score</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold">Overall Assessment</h4>
                      <p className="text-sm text-gray-600">{analysis.overall_assessment}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-green-700">Strengths</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {analysis.strengths.map((strength: string, i: number) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-red-700">Areas for Improvement</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {analysis.weaknesses.map((weakness: string, i: number) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={generateAnalysis} variant="outline" disabled={analyzing}>
                        {analyzing ? "Regenerating..." : "Regenerate Analysis"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Transcript Section */}
          <div>
            <LiveTranscript interviewId={interviewId} onTranscriptUpdate={setTranscript} />
          </div>
        </div>
      </div>
    </div>
  )
}
