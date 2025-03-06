import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY });

export async function analyzeProjectDescription(description: string): Promise<string> {
  try {
    const prompt = `
      Analyze this home improvement project description in Charleston, South Carolina:
      "${description}"

      Please provide:
      1. A detailed breakdown of what the project entails
      2. Mention reputable companies in Charleston, SC that could handle this type of work
      3. Any specific considerations for Charleston's climate and architecture
      4. Estimated timeline and any permits that might be needed

      Format this as a professional assessment that we can share with the client.
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
      Provide a detailed cost estimate for this home improvement project in Charleston, South Carolina:
      "${description}"

      Project Parameters:
      - Square Footage: ${parameters.squareFootage || 'Not specified'}
      - Quality Level: ${parameters.quality || 'standard'}
      - Timeline: ${parameters.timeline || 'standard'}
      - Location: ${parameters.location}

      Please provide:
      1. Total cost estimate
      2. Cost breakdown by major components
      3. Key factors affecting the estimate
      4. Local market considerations for Charleston, SC

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

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Grok API Error:", error);
    throw new Error("Failed to estimate project cost");
  }
}