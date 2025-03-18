import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY });

export async function analyzeProjectDescription(description: string, address?: string): Promise<string> {
  try {
    // Extract location from address or use default
    let location = "Charleston, South Carolina";
    if (address) {
      const match = address.match(/([^,]+),\s*([A-Z]{2})/);
      if (match) {
        location = `${match[1].trim()}, ${match[2]}`;
      }
    }

    const prompt = `
      Analyze this home improvement project description for ${location}:
      "${description}"

      Please provide a detailed analysis including:
      1. A comprehensive breakdown of what the project entails
      2. List at least 3-4 reputable and established companies in ${location} that specialize in this type of work:
         For each company include:
         - Company name
         - Phone number
         - Website URL
         - Areas of expertise
         - Years in business
         - Typical pricing range
         - Notable projects or specialties in ${location}
      3. Important considerations specific to ${location}'s:
         - Historic preservation requirements if applicable
         - Local climate challenges
         - Local building codes and permits
         - Architectural style compatibility
      4. Estimated timeline, including permit processing times in ${location}
      5. Local material availability and recommendations from ${location} suppliers
      6. Cost considerations:
         - Estimated cost range based on ${location} market rates
         - Factors that could affect the final cost
         - Typical payment schedules in ${location}
         - Any potential cost savings opportunities

      Format this as a professional assessment that highlights local expertise and considerations.
      Be specific about local companies and include their contact information, specialties, reputation, and typical pricing in ${location}.
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "Unable to analyze project at this time.";
  } catch (error) {
    console.error("Grok API Error:", error);
    throw new Error("Failed to analyze project description");
  }
}

export async function estimateProjectCost(description: string, parameters: {
  squareFootage?: number;
  quality?: 'basic' | 'standard' | 'premium';
  timeline?: 'standard' | 'expedited';
  location: string;
}): Promise<{
  estimate: number;
  breakdown: Record<string, number>;
  factors: string[];
}> {
  try {
    const prompt = `
      Provide a detailed cost estimate for this home improvement project in ${parameters.location}:
      "${description}"

      Project Parameters:
      - Square Footage: ${parameters.squareFootage || 'Not specified'}
      - Quality Level: ${parameters.quality || 'standard'}
      - Timeline: ${parameters.timeline || 'standard'}
      - Location: ${parameters.location}

      Please provide:
      1. Total cost estimate based on ${parameters.location} market rates
      2. Cost breakdown by major components
      3. Key factors affecting the estimate
      4. Local market considerations specific to ${parameters.location}

      Return the response in this exact JSON format:
      {
        "estimate": number (total cost in USD),
        "breakdown": {
          "labor": number,
          "materials": number,
          "permits": number,
          "overhead": number
        },
        "factors": [
          "string" (list of key factors affecting cost)
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Grok API Error:", error);
    throw new Error("Failed to estimate project cost");
  }
}