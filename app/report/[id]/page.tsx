"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase, type Interview, type Question, type Response, type Transcript } from "@/lib/supabase"
import { analyzeInterview } from "@/lib/openrouter"
import {
  ArrowLeft,
  BarChart3,
  FileText,
  MessageSquare,
  User,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReportPage() {
  const params = useParams()
  const interviewId = params.id as string
  const { toast } = useToast()

  const [interview, setInterview] = useState<Interview | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    loadReportData()
  }, [interviewId])

  const loadReportData = async () => {
    try {
      // Load interview
      const { data: interviewData, error: interviewError } = await supabase
        .from("interviews")
        .select("*")
        .eq("id", interviewId)
        .single()

      if (interviewError) throw interviewError
      setInterview(interviewData)

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("interview_id", interviewId)
        .order("order_index")

      if (questionsError) throw questionsError
      setQuestions(questionsData)

      // Load responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("responses")
        .select("*")
        .in(
          "question_id",
          questionsData.map((q) => q.id),
        )

      if (responsesError) throw responsesError
      setResponses(responsesData)

      // Load transcripts
      const { data: transcriptData, error: transcriptError } = await supabase
        .from("transcripts")
        .select("*")
        .eq("interview_id", interviewId)
        .order("created_at")

      if (transcriptError) throw transcriptError
      setTranscripts(transcriptData)

      // Load existing analysis if available
      if (
        interviewData.overall_assessment ||
        interviewData.strengths ||
        interviewData.weaknesses ||
        interviewData.gaps_analysis ||
        interviewData.training_needs
      ) {
        setAnalysis({
          overall_assessment: interviewData.overall_assessment || "Analysis completed - view details below",
          strengths: interviewData.strengths ? interviewData.strengths.split(", ") : ["Based on interview responses"],
          weaknesses: interviewData.weaknesses
            ? interviewData.weaknesses.split(", ")
            : ["Areas identified for improvement"],
          skill_gaps: interviewData.gaps_analysis ? interviewData.gaps_analysis.split(", ") : [],
          training_recommendations: interviewData.training_needs ? interviewData.training_needs.split(", ") : [],
          cultural_fit: "Assessment based on interview",
          recommendation: interviewData.recommendation || "Available",
          confidence_score: interviewData.confidence_score || (interviewData.final_score || 0) / 100,
        })
      }
    } catch (error) {
      console.error("Error loading report data:", error)
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const regenerateAnalysis = async () => {
    setRegenerating(true)
    try {
      const fullTranscript = transcripts
        .map((t) => {
          const timestamp = new Date(t.created_at).toLocaleTimeString()
          return `[${timestamp}] ${t.speaker.toUpperCase()}: ${t.transcript_text}`
        })
        .join("\n")

      const { analysis } = await analyzeInterview(interview, questions, responses, fullTranscript)
      setAnalysis(analysis)

      // Calculate average score
      const scoredResponses = responses.filter((r) => r.score !== null && r.score !== undefined)
      const averageScore =
        scoredResponses.length > 0
          ? scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0) / scoredResponses.length
          : 0

      // Update interview with new analysis
      await supabase
        .from("interviews")
        .update({
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

      // Update local state
      setInterview((prev) =>
        prev
          ? {
              ...prev,
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
        title: "Analysis Regenerated",
        description: "The interview analysis has been updated",
      })
    } catch (error) {
      console.error("Error regenerating analysis:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate analysis",
        variant: "destructive",
      })
    } finally {
      setRegenerating(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minutes`
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading report...</div>
  }

  if (!interview) {
    return <div className="flex items-center justify-center min-h-screen">Interview not found</div>
  }

  // Calculate statistics
  const scoredResponses = responses.filter((r) => r.score !== null && r.score !== undefined)
  const averageScore =
    scoredResponses.length > 0
      ? Math.round((scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0) / scoredResponses.length) * 10)
      : 0

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "hire":
        return "default"
      case "maybe":
        return "secondary"
      case "no_hire":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/interviews">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">🌳 Treehire Report</h1>
              <p className="text-gray-600">{interview.title}</p>
            </div>
            <Button onClick={regenerateAnalysis} disabled={regenerating} className="bg-green-600 hover:bg-green-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              {regenerating ? "Regenerating..." : "Regenerate Analysis"}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Candidate</p>
                  <p className="text-lg font-semibold">{interview.candidate_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Briefcase className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="text-lg font-semibold">{interview.position}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Average Score</p>
                  <p className="text-lg font-semibold">{averageScore}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-lg font-semibold">
                    {interview.duration_minutes ? formatDuration(interview.duration_minutes) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Timing Info */}
        {interview.start_time && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    Started: {new Date(interview.start_time).toLocaleString()}
                  </span>
                </div>
                {interview.end_time && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">
                      Ended: {new Date(interview.end_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attached Documents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Attached Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {interview.resume_url && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">Resume</h4>
                      <p className="text-sm text-green-600">Candidate's resume document</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={interview.resume_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {interview.job_requirements_url && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-800">Job Requirements</h4>
                      <p className="text-sm text-blue-600">Position requirements document</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={interview.job_requirements_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {interview.cover_letter_url && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-purple-800">Cover Letter</h4>
                      <p className="text-sm text-purple-600">Candidate's cover letter</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={interview.cover_letter_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!interview.resume_url && !interview.job_requirements_url && !interview.cover_letter_url && (
              <p className="text-gray-500 text-center py-4">No documents attached to this interview</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Questions and Responses */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Questions & Responses
                </CardTitle>
                <CardDescription>
                  {questions.length} questions with {responses.length} responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => {
                  const response = responses.find((r) => r.question_id === question.id)
                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">Q{index + 1}:</h4>
                        <div className="flex gap-2">
                          <Badge variant={question.question_type === "generated" ? "default" : "secondary"}>
                            {question.question_type}
                          </Badge>
                          {response?.score && <Badge variant="outline">{response.score}/10</Badge>}
                        </div>
                      </div>
                      <p className="text-sm mb-3">{question.question_text}</p>
                      {response?.answer_text && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm">
                            <strong>Answer:</strong> {response.answer_text}
                          </p>
                          {response.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Notes:</strong> {response.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Analysis and Transcript */}
          <div className="space-y-6">
            {/* AI Analysis */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      AI Analysis
                    </div>
                    <Badge variant={getRecommendationColor(analysis.recommendation)}>
                      {analysis.recommendation.replace("_", " ").toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Overall Assessment</h4>
                    <p className="text-sm text-gray-600">{analysis.overall_assessment}</p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        {analysis.strengths.map((strength: string, i: number) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">Areas for Improvement</h4>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        {analysis.weaknesses.map((weakness: string, i: number) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Skill Gaps</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.skill_gaps.map((gap: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Training Recommendations</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.training_recommendations.map((rec: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {rec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-center pt-4">
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round(analysis.confidence_score * 100)}%
                    </div>
                    <div className="text-sm text-gray-500">Confidence Score</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Interview Transcript
                </CardTitle>
                <CardDescription>{transcripts.length} transcript entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                  {transcripts.length > 0 ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {transcripts
                        .map((t) => {
                          const timestamp = new Date(t.created_at).toLocaleTimeString()
                          return `[${timestamp}] ${t.speaker.toUpperCase()}: ${t.transcript_text}`
                        })
                        .join("\n")}
                    </pre>
                  ) : (
                    <p className="text-gray-500 text-center">No transcript available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
