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
            
            Extract the following information and return a JSON object:
            {
              "candidateName": "Full name of the candidate from the resume",
              "position": "Job title/position from the job requirements",
              "title": "A descriptive interview title combining the position and candidate name"
            }
            
            Guidelines:
            - For candidateName: Extract the full name, usually found at the top of the resume
            - For position: Use the exact job title from the job requirements/description
            - For title: Create a professional interview title like "Senior Developer Interview - John Smith" or "Marketing Manager Interview"
            - If information is not clearly available, return empty string for that field
            - Be conservative - only extract if you're confident about the information`,
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
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to extract information")
    }

    const data = await response.json()
    const extractedInfo = JSON.parse(data.choices[0].message.content)

    return NextResponse.json(extractedInfo)
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
