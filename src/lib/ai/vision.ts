import Anthropic from "@anthropic-ai/sdk";
import { AIFoodAnalysisSchema, type AIFoodAnalysis } from "@/lib/schemas/food-log";
import { FOOD_ANALYSIS_SYSTEM_PROMPT, FOOD_ANALYSIS_TOOL } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeFood(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<{ data: AIFoodAnalysis | null; error: string | null; raw: unknown }> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: FOOD_ANALYSIS_SYSTEM_PROMPT,
      tools: [FOOD_ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "log_food_analysis" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Analyze this food photo and provide a detailed nutritional breakdown.",
            },
          ],
        },
      ],
    });

    // Extract tool use result
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { data: null, error: "AI did not return structured data", raw: response.content };
    }

    // Validate with Zod
    const parsed = AIFoodAnalysisSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      return {
        data: null,
        error: `Validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        raw: toolUse.input,
      };
    }

    return { data: parsed.data, error: null, raw: toolUse.input };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message, raw: null };
  }
}
