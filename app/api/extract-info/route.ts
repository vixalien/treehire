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
      const errorText = await response.text()
      console.error("OpenRouter API error:", response.status, errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()

    console.log("Raw extraction response:", content)

    // Try to extract and parse JSON
    let extractedInfo
    try {
      // First, try to parse directly
      extractedInfo = JSON.parse(content)
    } catch (parseError) {
      console.log("Direct parse failed, trying to extract JSON...")

      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        try {
          extractedInfo = JSON.parse(jsonMatch[1])
        } catch (extractError) {
          console.error("Failed to parse extracted JSON:", extractError)
          throw new Error("Invalid JSON in code block")
        }
      } else {
        // Try to find JSON object in the text
        const objectMatch = content.match(/\{[\s\S]*?\}/)
        if (objectMatch) {
          try {
            extractedInfo = JSON.parse(objectMatch[0])
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
    const result = {
      candidateName: extractedInfo.candidateName || "",
      position: extractedInfo.position || "",
      title: extractedInfo.title || "",
    }

    console.log("Successfully extracted info:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error extracting information:", error)

    // Return empty values instead of error to prevent blocking the flow
    const fallbackResult = {
      candidateName: "",
      position: "",
      title: "",
    }

    console.log("Returning fallback extraction result due to error")
    return NextResponse.json(fallbackResult, { status: 200 })
  }
}
