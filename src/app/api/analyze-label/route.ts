import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const LabelSchema = z.object({
  product_name: z.string(),
  serving_size: z.string(),
  servings_per_container: z.number().nullable(),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
});

export type LabelAnalysis = z.infer<typeof LabelSchema>;

const LABEL_TOOL = {
  name: "log_label_analysis" as const,
  description: "Extract nutrition facts from a food label photo.",
  input_schema: {
    type: "object" as const,
    properties: {
      product_name: { type: "string" as const, description: "Product name if visible" },
      serving_size: { type: "string" as const, description: "Serving size (e.g. '1 cup (240g)')" },
      servings_per_container: { type: "number" as const, description: "Servings per container, null if not visible" },
      calories: { type: "number" as const },
      protein_g: { type: "number" as const },
      carbs_g: { type: "number" as const },
      fat_g: { type: "number" as const },
      fiber_g: { type: "number" as const },
      sugar_g: { type: "number" as const },
      sodium_mg: { type: "number" as const },
      confidence: { type: "number" as const, description: "0-1 confidence in accuracy of extraction" },
    },
    required: ["product_name", "serving_size", "servings_per_container", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "confidence"],
  },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: `You are a nutrition label OCR assistant. Extract the nutrition facts from the photo as accurately as possible. Read every number carefully. If a field is not visible, use 0. Set confidence based on label legibility.`,
      tools: [LABEL_TOOL],
      tool_choice: { type: "tool", name: "log_label_analysis" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Extract the nutrition facts from this label photo.",
            },
          ],
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return NextResponse.json({ error: "AI did not return structured data" }, { status: 422 });
    }

    const parsed = LabelSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid label data", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("analyze-label error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
