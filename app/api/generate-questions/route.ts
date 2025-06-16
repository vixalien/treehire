import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { resume, jobRequirements, customQuestions, coverLetter } = await request.json()

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
            content: `You are an expert interviewer. Generate relevant interview questions based on the candidate's resume, job requirements, and optional cover letter. 
            
            Return a JSON array of questions with the following structure:
            [
              {
                "question": "Question text here",
                "category": "technical|behavioral|experience|cultural_fit",
                "difficulty": "easy|medium|hard",
                "reasoning": "Why this question is relevant"
              }
            ]
            
            Generate 8-12 questions that cover:
            - Technical skills matching the job requirements
            - Behavioral questions based on experience
            - Situational questions
            - Questions about gaps or areas for growth
            - If cover letter is provided, include questions about motivations and specific points mentioned
            
            Make questions specific to the candidate's background and the role.`,
          },
          {
            role: "user",
            content: `Resume: ${resume}

Job Requirements: ${jobRequirements}

${coverLetter ? `Cover Letter: ${coverLetter}` : ""}

Custom Questions to Include: ${customQuestions.join(", ")}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate questions")
    }

    const data = await response.json()
    const generatedQuestions = JSON.parse(data.choices[0].message.content)

    return NextResponse.json({ questions: generatedQuestions })
  } catch (error) {
    console.error("Error generating questions:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
