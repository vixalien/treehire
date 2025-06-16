import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { resume, jobRequirements } = await request.json()

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
            content: `You are an expert at extracting key information from resumes and job descriptions. 
            
            You MUST return ONLY a valid JSON object with no additional text, explanations, or formatting. 
            
            Return exactly this structure:
            {"candidateName": "Full name of the candidate from the resume", "position": "Job title/position from the job requirements", "title": "A descriptive interview title combining the position and candidate name"}
            
            Guidelines:
            - For candidateName: Extract the full name, usually found at the top of the resume. If not clearly available, return empty string.
            - For position: Use the exact job title from the job requirements/description. If not clearly available, return empty string.
            - For title: Create a professional interview title like "Senior Developer Interview - John Smith" or "Marketing Manager Interview". If no candidate name, just use position + "Interview".
            - Return ONLY the JSON object, no other text whatsoever.`,
          },
          {
            role: "user",
            content: `Resume Content:
${resume}

Job Requirements:
${jobRequirements}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to extract information")
    }

    const data = await response.json()
    let content = data.choices[0].message.content.trim()

    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      content = jsonMatch[0]
    }

    // Clean up any markdown formatting
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "")

    try {
      const extractedInfo = JSON.parse(content)
      return NextResponse.json(extractedInfo)
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError)
      console.error("Content received:", content)
      // Return empty values if parsing fails
      return NextResponse.json({
        candidateName: "",
        position: "",
        title: "",
      })
    }
  } catch (error) {
    console.error("Error extracting information:", error)
    return NextResponse.json(
      {
        candidateName: "",
        position: "",
        title: "",
      },
      { status: 200 },
    ) // Return empty values instead of error
  }
}
