export async function generateQuestions(resume: string, jobRequirements: string, customQuestions: string[]) {
  const response = await fetch("/api/generate-questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resume,
      jobRequirements,
      customQuestions,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to generate questions")
  }

  return response.json()
}

export async function analyzeInterview(interview: any, questions: any[], responses: any[], transcript: string) {
  const response = await fetch("/api/analyze-interview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      interview,
      questions,
      responses,
      transcript,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to analyze interview")
  }

  return response.json()
}
