"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase, type Interview } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { Plus, User, Briefcase, Trash2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadInterviews()
    }
  }, [user])

  const loadInterviews = async () => {
    try {
      // First get interviews for the current user
      const { data: interviewsData, error: interviewsError } = await supabase
        .from("interviews")
        .select("*")
        .order("created_at", { ascending: false })

      if (interviewsError) throw interviewsError

      // Then get profile information for each unique user_id
      const userIds = [...new Set(interviewsData.map((interview) => interview.user_id).filter(Boolean))]

      let profilesData = []
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*").in("id", userIds)

        if (profilesError && profilesError.code !== "PGRST116") {
          console.error("Error loading profiles:", profilesError)
        } else {
          profilesData = profiles || []
        }
      }

      // Combine interviews with their corresponding profiles
      const interviewsWithProfiles = interviewsData.map((interview) => ({
        ...interview,
        profiles: profilesData.find((profile) => profile.id === interview.user_id) || null,
      }))

      setInterviews(interviewsWithProfiles)
    } catch (error) {
      console.error("Error loading interviews:", error)
      toast({
        title: "Error",
        description: "Failed to load interviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteInterview = async (interviewId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(interviewId)
    try {
      const { error } = await supabase.from("interviews").delete().eq("id", interviewId)

      if (error) throw error

      setInterviews((prev) => prev.filter((interview) => interview.id !== interviewId))
      toast({
        title: "Interview Deleted",
        description: `"${title}" has been deleted successfully`,
      })
    } catch (error) {
      console.error("Error deleting interview:", error)
      toast({
        title: "Error",
        description: "Failed to delete interview",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🌳 Treehire Dashboard</h1>
            <p className="text-gray-600">Manage and review your interview sessions</p>
          </div>
          <Link href="/">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              New Interview
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviews.map((interview) => (
            <Card key={interview.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{interview.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(interview.status)}>{interview.status.replace("_", " ")}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInterview(interview.id, interview.title)}
                      disabled={deleting === interview.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(interview.created_at).toLocaleDateString()}
                  {interview.profiles && (
                    <span className="block text-xs text-green-600 mt-1">
                      Interviewer: {interview.profiles.full_name || "Unknown"}
                      {interview.profiles.company && ` • ${interview.profiles.company}`}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {interview.candidate_name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 mr-2" />
                    {interview.position}
                  </div>
                  {interview.start_time && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Started: {new Date(interview.start_time).toLocaleDateString()} at{" "}
                      {new Date(interview.start_time).toLocaleTimeString()}
                    </div>
                  )}
                  {interview.duration_minutes && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Duration: {formatDuration(interview.duration_minutes)}</span>
                    </div>
                  )}
                  {interview.final_score && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Score: {Math.round(interview.final_score * 10)}/100</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link href={`/interview/${interview.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      {interview.status === "completed"
                        ? "Review"
                        : interview.status === "in_progress"
                          ? "Continue"
                          : "Start"}
                    </Button>
                  </Link>
                  {interview.status === "completed" && (
                    <Link href={`/report/${interview.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Report
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {interviews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first interview session with Treehire</p>
            <Link href="/">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Interview
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
