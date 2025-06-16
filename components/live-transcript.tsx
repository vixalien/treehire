"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Square, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

interface LiveTranscriptProps {
  interviewId: string
  onTranscriptUpdate: (transcript: string) => void
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function LiveTranscript({ interviewId, onTranscriptUpdate }: LiveTranscriptProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [currentSpeaker, setCurrentSpeaker] = useState<"interviewer" | "candidate">("interviewer")
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any | null>(null)
  const [interimTranscript, setInterimTranscript] = useState("")

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)
      recognitionRef.current = new SpeechRecognition()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"
        recognitionRef.current.maxAlternatives = 1

        recognitionRef.current.onstart = () => {
          console.log("Speech recognition started")
          setError(null)
        }

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ""
          let interim = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart
            } else {
              interim += transcriptPart
            }
          }

          setInterimTranscript(interim)

          if (finalTranscript) {
            const timestamp = new Date().toLocaleTimeString()
            const newEntry = `[${timestamp}] ${currentSpeaker.toUpperCase()}: ${finalTranscript}\n`

            setTranscript((prev) => {
              const updated = prev + newEntry
              onTranscriptUpdate(updated)
              return updated
            })

            // Save to database
            saveTranscriptEntry(finalTranscript)
            setInterimTranscript("")
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setError(`Speech recognition error: ${event.error}`)
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended")
          setIsRecording(false)
        }
      }
    } else {
      setIsSupported(false)
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
    }

    // Load existing transcript
    loadExistingTranscript()

    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop()
      }
    }
  }, [interviewId, currentSpeaker, onTranscriptUpdate])

  const loadExistingTranscript = async () => {
    try {
      const { data: transcriptData, error: transcriptError } = await supabase
        .from("transcripts")
        .select("*")
        .eq("interview_id", interviewId)
        .order("created_at")

      if (transcriptError) throw transcriptError

      if (transcriptData && transcriptData.length > 0) {
        const fullTranscript =
          transcriptData
            .map((t) => {
              const timestamp = new Date(t.created_at).toLocaleTimeString()
              return `[${timestamp}] ${t.speaker.toUpperCase()}: ${t.transcript_text}`
            })
            .join("\n") + "\n"

        setTranscript(fullTranscript)
        onTranscriptUpdate(fullTranscript)
      }
    } catch (error) {
      console.error("Error loading transcript:", error)
    }
  }

  const saveTranscriptEntry = async (text: string) => {
    try {
      await supabase.from("transcripts").insert({
        interview_id: interviewId,
        transcript_text: text,
        speaker: currentSpeaker,
      })
    } catch (error) {
      console.error("Error saving transcript:", error)
    }
  }

  const startRecording = async () => {
    if (!recognitionRef.current || !isSupported) return

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })

      recognitionRef.current.start()
      setIsRecording(true)
      setError(null)
    } catch (err: any) {
      console.error("Error starting recording:", err)
      setError("Microphone access denied. Please allow microphone access and try again.")
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleSpeaker = () => {
    setCurrentSpeaker((prev) => (prev === "interviewer" ? "candidate" : "interviewer"))
  }

  const clearTranscript = async () => {
    try {
      await supabase.from("transcripts").delete().eq("interview_id", interviewId)
      setTranscript("")
      onTranscriptUpdate("")
    } catch (error) {
      console.error("Error clearing transcript:", error)
    }
  }

  if (!isSupported) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Live Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for live
              transcription.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Live Transcript
          <div className="flex gap-2">
            <Button
              variant={currentSpeaker === "interviewer" ? "default" : "outline"}
              size="sm"
              onClick={toggleSpeaker}
              disabled={isRecording}
            >
              {currentSpeaker === "interviewer" ? "Interviewer" : "Candidate"}
            </Button>
            {!isRecording ? (
              <Button onClick={startRecording} size="sm" disabled={!isSupported}>
                <Mic className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            <Button onClick={clearTranscript} variant="outline" size="sm" disabled={isRecording}>
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {transcript || "Transcript will appear here when recording starts..."}
            {interimTranscript && <span className="text-gray-500 italic">{interimTranscript}</span>}
          </pre>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
            Recording as {currentSpeaker}... (Click Stop when finished speaking)
          </div>
        )}

        {!isRecording && transcript && (
          <div className="mt-2 text-sm text-gray-600">
            Click Start to continue recording. Switch speaker before recording different people.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
