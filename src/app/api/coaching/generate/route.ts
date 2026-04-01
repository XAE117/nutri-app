import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSemanticState, refreshSemanticState } from "@/lib/ai/semantic-state";

export const maxDuration = 60;
import { getRecentEpisodes } from "@/lib/ai/memory";
import { COACHING_SYSTEM_PROMPT, COACHING_REVIEW_TOOL } from "@/lib/ai/prompts";

const ReviewSchema = z.object({
  summary: z.string(),
  insights: z.array(z.object({
    observation: z.string(),
    category: z.enum(["pattern", "trend", "milestone", "consistency"]),
  })),
  recommendations: z.array(z.object({
    suggestion: z.string(),
    priority: z.enum(["low", "medium"]),
  })),
  encouragement: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Calculate week range
    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekStartISO = weekStart.toISOString().slice(0, 10);
    const weekEndISO = weekEnd.toISOString().slice(0, 10);

    // Check for existing review this week
    const { data: existing } = await supabase
      .from("coaching_reviews")
      .select("id")
      .eq("user_id", user.id)
      .gte("week_start", weekStartISO)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Review already exists for this week", reviewId: existing[0].id },
        { status: 409 }
      );
    }

    // Gather data
    const [semanticState, episodes, foodRes, weightRes] = await Promise.all([
      refreshSemanticState(supabase, user.id),
      getRecentEpisodes(supabase, user.id, 10),
      supabase
        .from("food_logs")
        .select("logged_at, calories, protein_g, carbs_g, fat_g, meal_type, description")
        .eq("user_id", user.id)
        .gte("logged_at", weekStart.toISOString())
        .lte("logged_at", weekEnd.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("weight_logs")
        .select("logged_at, weight_kg")
        .eq("user_id", user.id)
        .gte("logged_at", weekStartISO)
        .order("logged_at", { ascending: true }),
    ]);

    const foods = foodRes.data ?? [];
    const weights = weightRes.data ?? [];

    if (foods.length === 0) {
      return NextResponse.json(
        { error: "No food logs this week — need data for a review" },
        { status: 400 }
      );
    }

    // Aggregate weekly data
    const dailyCals: Record<string, number> = {};
    let totalCals = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    for (const f of foods) {
      const day = f.logged_at.slice(0, 10);
      dailyCals[day] = (dailyCals[day] ?? 0) + (f.calories ?? 0);
      totalCals += f.calories ?? 0;
      totalProtein += f.protein_g ?? 0;
      totalCarbs += f.carbs_g ?? 0;
      totalFat += f.fat_g ?? 0;
    }

    const trackingDays = Object.keys(dailyCals).length;
    const weeklyData = {
      total_entries: foods.length,
      tracking_days: trackingDays,
      avg_daily_calories: Math.round(totalCals / trackingDays),
      total_protein_g: Math.round(totalProtein),
      total_carbs_g: Math.round(totalCarbs),
      total_fat_g: Math.round(totalFat),
      weight_entries: weights.length,
      weight_start: weights[0]?.weight_kg ?? null,
      weight_end: weights[weights.length - 1]?.weight_kg ?? null,
    };

    // Build prompt
    const prompt = COACHING_SYSTEM_PROMPT
      .replace("{semantic_state}", JSON.stringify(semanticState, null, 2))
      .replace("{past_episodes}", episodes.map((e) => e.content).join("\n"))
      .replace("{weekly_data}", JSON.stringify(weeklyData, null, 2));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: prompt,
      tools: [COACHING_REVIEW_TOOL],
      tool_choice: { type: "tool", name: "generate_coaching_review" },
      messages: [
        {
          role: "user",
          content: `Generate my weekly nutrition coaching review for ${weekStartISO} to ${weekEndISO}.`,
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return NextResponse.json({ error: "AI did not return structured review" }, { status: 422 });
    }

    const parsed = ReviewSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review data", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Save to DB
    const { data: review, error: dbError } = await supabase
      .from("coaching_reviews")
      .insert({
        user_id: user.id,
        week_start: weekStartISO,
        week_end: weekEndISO,
        summary: parsed.data.summary,
        insights: parsed.data.insights,
        recommendations: parsed.data.recommendations,
        metrics: weeklyData,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: "Failed to save review", details: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ review, coaching: parsed.data });
  } catch (err) {
    console.error("Coaching generation error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("credit balance")) {
      return NextResponse.json({ error: "API credits exhausted. Please add funds at console.anthropic.com." }, { status: 402 });
    }
    if (msg.includes("rate_limit") || msg.includes("429")) {
      return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Coaching review failed — please try again." }, { status: 500 });
  }
}
