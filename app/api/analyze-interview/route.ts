import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { interview, questions, responses, transcript } = await request.json()

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: `You are an expert interview analyst. Analyze the interview data and provide comprehensive insights.
            
            Return a JSON object with the following structure:
            {
              "overall_assessment": "Overall performance summary",
              "strengths": ["List of candidate strengths"],
              "weaknesses": ["List of areas for improvement"],
              "skill_gaps": ["Specific skill gaps identified"],
              "training_recommendations": ["Specific training recommendations"],
              "cultural_fit": "Assessment of cultural fit",
              "recommendation": "hire|maybe|no_hire",
              "confidence_score": 0.85
            }`,
          },
          {
            role: "user",
            content: `Interview Details:
            Position: ${interview.position}
            Candidate: ${interview.candidate_name}
            
            Questions and Responses:
            ${questions
              .map((q: any, i: number) => {
                const response = responses.find((r: any) => r.question_id === q.id)
                return `Q${i + 1}: ${q.question_text}
              Answer: ${response?.answer_text || "No answer provided"}
              Score: ${response?.score || "Not scored"}/10
              Notes: ${response?.notes || "No notes"}`
              })
              .join("\n\n")}
            
            Full Transcript:
            ${transcript}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to analyze interview")
    }

    const data = await response.json()
    const analysis = JSON.parse(data.choices[0].message.content)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Error analyzing interview:", error)
    return NextResponse.json({ error: "Failed to analyze interview" }, { status: 500 })
  }
}
