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
            
            You MUST return ONLY a valid JSON array with no additional text, explanations, or formatting. 
            
            Return exactly this structure:
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
            
            Make questions specific to the candidate's background and the role.
            
            IMPORTANT: Return ONLY the JSON array, no other text whatsoever.`,
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
      const errorText = await response.text()
      console.error("OpenRouter API error:", response.status, errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()

    console.log("Raw AI response:", content)

    // Try to extract JSON from the response
    let generatedQuestions
    try {
      // First, try to parse directly
      generatedQuestions = JSON.parse(content)
    } catch (parseError) {
      console.log("Direct parse failed, trying to extract JSON...")

      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
      if (jsonMatch) {
        try {
          generatedQuestions = JSON.parse(jsonMatch[1])
        } catch (extractError) {
          console.error("Failed to parse extracted JSON:", extractError)
          throw new Error("Invalid JSON in code block")
        }
      } else {
        // Try to find JSON array in the text
        const arrayMatch = content.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          try {
            generatedQuestions = JSON.parse(arrayMatch[0])
          } catch (arrayError) {
            console.error("Failed to parse array match:", arrayError)
            throw new Error("Invalid JSON array found")
          }
        } else {
          console.error("No JSON found in response:", content)
          // Return fallback questions
          generatedQuestions = [
            {
              question: "Can you tell me about your background and experience relevant to this position?",
              category: "experience",
              difficulty: "easy",
              reasoning: "General opening question to understand candidate's background",
            },
            {
              question: "What interests you most about this role and our company?",
              category: "cultural_fit",
              difficulty: "easy",
              reasoning: "Assess motivation and cultural alignment",
            },
            {
              question: "Describe a challenging project you've worked on and how you overcame obstacles.",
              category: "behavioral",
              difficulty: "medium",
              reasoning: "Evaluate problem-solving and resilience",
            },
            {
              question: "What are your greatest strengths and how do they apply to this position?",
              category: "experience",
              difficulty: "easy",
              reasoning: "Understand candidate's self-assessment and relevance",
            },
            {
              question: "Where do you see yourself in 3-5 years?",
              category: "cultural_fit",
              difficulty: "medium",
              reasoning: "Assess career goals and long-term fit",
            },
          ]
        }
      }
    }

    // Validate the structure
    if (!Array.isArray(generatedQuestions)) {
      console.error("Response is not an array:", generatedQuestions)
      throw new Error("Generated questions must be an array")
    }

    // Ensure each question has required fields
    const validatedQuestions = generatedQuestions.map((q, index) => ({
      question: q.question || `Generated question ${index + 1}`,
      category: q.category || "general",
      difficulty: q.difficulty || "medium",
      reasoning: q.reasoning || "AI-generated question",
    }))

    console.log("Successfully parsed questions:", validatedQuestions.length)

    return NextResponse.json({ questions: validatedQuestions })
  } catch (error) {
    console.error("Error generating questions:", error)

    // Return fallback questions instead of failing
    const fallbackQuestions = [
      {
        question: "Can you walk me through your professional background and what led you to apply for this position?",
        category: "experience",
        difficulty: "easy",
        reasoning: "Opening question to understand candidate's journey",
      },
      {
        question: "What specific skills and experiences make you a good fit for this role?",
        category: "experience",
        difficulty: "medium",
        reasoning: "Assess relevant qualifications",
      },
      {
        question: "Describe a time when you had to learn a new technology or skill quickly. How did you approach it?",
        category: "behavioral",
        difficulty: "medium",
        reasoning: "Evaluate learning ability and adaptability",
      },
      {
        question: "Tell me about a challenging situation you faced at work and how you resolved it.",
        category: "behavioral",
        difficulty: "medium",
        reasoning: "Assess problem-solving and resilience",
      },
      {
        question: "What motivates you in your work, and what type of work environment do you thrive in?",
        category: "cultural_fit",
        difficulty: "easy",
        reasoning: "Understand motivation and cultural fit",
      },
      {
        question: "How do you handle working under pressure or tight deadlines?",
        category: "behavioral",
        difficulty: "medium",
        reasoning: "Evaluate stress management and time management",
      },
      {
        question: "What are your career goals, and how does this position align with them?",
        category: "cultural_fit",
        difficulty: "medium",
        reasoning: "Assess long-term fit and motivation",
      },
      {
        question: "Do you have any questions about the role, team, or company?",
        category: "cultural_fit",
        difficulty: "easy",
        reasoning: "Give candidate opportunity to ask questions",
      },
    ]

    console.log("Returning fallback questions due to error")
    return NextResponse.json({ questions: fallbackQuestions })
  }
}
