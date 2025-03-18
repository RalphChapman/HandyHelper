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
      const match = address.match(/,?\s*([^,]+),\s*([A-Za-z]{2})\s*$/);
      if (match) {
        location = `${match[1].trim()}, ${match[2]}`;
      }
    }

    const prompt = `
      This is a project analysis request for a specific location: ${location}
      Please analyze this home improvement project description, focusing exclusively on resources and considerations for ${location}:

      Project Description:
      "${description}"

      IMPORTANT: All information, especially company recommendations, must be specifically for ${location} only.
      Do not include companies or references from other locations.

      Please provide:

      1. Project Scope Analysis:
         - Detailed breakdown of required work
         - Local permit requirements specific to ${location}
         - ${location}-specific building codes that apply

      2. Local Service Providers:
         IMPORTANT: List ONLY companies that are based in and serve ${location}.
         For each company in ${location}, provide:
         - Company name
         - Local ${location} phone number
         - Physical address in ${location}
         - Years serving ${location} community
         - Specific experience with similar projects in ${location}
         - Local pricing ranges for ${location} market
         - Notable ${location} projects and references

      3. ${location}-Specific Considerations:
         - Local climate and weather impacts
         - Municipal regulations unique to ${location}
         - Local architectural requirements
         - ${location} historic preservation rules (if applicable)

      4. Timeline and Process:
         - Current permit processing times in ${location}
         - Typical project duration for ${location} area
         - Local inspection requirements

      5. Materials and Resources:
         - Local suppliers in ${location}
         - ${location}-specific material costs
         - Local availability and lead times

      6. Cost Analysis for ${location} Market:
         - Current local market rates
         - ${location}-specific pricing factors
         - Local payment terms and schedules
         - Regional cost-saving opportunities

      Remember: Focus exclusively on ${location}. Do not include information or companies from other areas.
      Format this as a professional assessment that demonstrates deep local knowledge of ${location}'s home improvement market.
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