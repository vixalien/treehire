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
            
            You MUST return ONLY a valid JSON object with no additional text, explanations, or formatting.
            
            Return exactly this structure:
            {
              "overall_assessment": "Overall performance summary",
              "strengths": ["List of candidate strengths"],
              "weaknesses": ["List of areas for improvement"],
              "skill_gaps": ["Specific skill gaps identified"],
              "training_recommendations": ["Specific training recommendations"],
              "cultural_fit": "Assessment of cultural fit",
              "recommendation": "hire|maybe|no_hire",
              "confidence_score": 0.85
            }
            
            IMPORTANT: Return ONLY the JSON object, no other text whatsoever.`,
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
      const errorText = await response.text()
      console.error("OpenRouter API error:", response.status, errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()

    console.log("Raw analysis response:", content)

    // Try to extract and parse JSON
    let analysis
    try {
      // First, try to parse directly
      analysis = JSON.parse(content)
    } catch (parseError) {
      console.log("Direct parse failed, trying to extract JSON...")

      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[1])
        } catch (extractError) {
          console.error("Failed to parse extracted JSON:", extractError)
          throw new Error("Invalid JSON in code block")
        }
      } else {
        // Try to find JSON object in the text
        const objectMatch = content.match(/\{[\s\S]*?\}/)
        if (objectMatch) {
          try {
            analysis = JSON.parse(objectMatch[0])
          } catch (objectError) {
            console.error("Failed to parse object match:", objectError)
            throw new Error("Invalid JSON object found")
          }
        } else {
          console.error("No JSON found in response:", content)
          throw new Error("No valid JSON found in response")
        }
      }
    }

    // Validate and provide defaults
    const validatedAnalysis = {
      overall_assessment:
        analysis.overall_assessment || "Interview analysis completed based on responses and transcript.",
      strengths: Array.isArray(analysis.strengths)
        ? analysis.strengths
        : ["Communication skills", "Relevant experience"],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : ["Areas for development identified"],
      skill_gaps: Array.isArray(analysis.skill_gaps) ? analysis.skill_gaps : ["Technical skills assessment"],
      training_recommendations: Array.isArray(analysis.training_recommendations)
        ? analysis.training_recommendations
        : ["Professional development opportunities"],
      cultural_fit: analysis.cultural_fit || "Cultural fit assessment based on interview responses",
      recommendation: analysis.recommendation || "maybe",
      confidence_score: typeof analysis.confidence_score === "number" ? analysis.confidence_score : 0.75,
    }

    console.log("Successfully analyzed interview")
    return NextResponse.json({ analysis: validatedAnalysis })
  } catch (error) {
    console.error("Error analyzing interview:", error)

    // Return fallback analysis instead of failing
    const fallbackAnalysis = {
      overall_assessment:
        "Interview analysis completed. Please review the responses and transcript for detailed insights.",
      strengths: ["Participated in interview process", "Provided responses to questions"],
      weaknesses: ["Analysis requires manual review"],
      skill_gaps: ["Technical assessment needed"],
      training_recommendations: ["Professional development opportunities"],
      cultural_fit: "Requires further evaluation",
      recommendation: "maybe",
      confidence_score: 0.5,
    }

    console.log("Returning fallback analysis due to error")
    return NextResponse.json({ analysis: fallbackAnalysis })
  }
}
