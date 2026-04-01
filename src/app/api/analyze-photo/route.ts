import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFood } from "@/lib/ai/vision";
import { getSemanticState } from "@/lib/ai/semantic-state";
import { getRecentEpisodes, createMealEpisode, generateMealSummary } from "@/lib/ai/memory";

export const maxDuration = 60;

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
    const userHint = (formData.get("hint") as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    const mediaType = file.type as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/gif";

    // Upload to Supabase Storage
    const fileExt = file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("food-photos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue anyway — photo storage is nice-to-have, not blocking
    }

    // Fetch AI memory context (non-blocking — skip if fails)
    let semanticState, pastEpisodes;
    try {
      [semanticState, pastEpisodes] = await Promise.all([
        getSemanticState(supabase, user.id),
        getRecentEpisodes(supabase, user.id, 5),
      ]);
    } catch {
      // Memory is optional — proceed without it
    }

    // Analyze with Claude Vision (with memory context + user hint)
    const { data, error, raw } = await analyzeFood(base64, mediaType, {
      semanticState,
      pastEpisodes,
      userHint,
    });

    if (error || !data) {
      return NextResponse.json(
        { error: error || "Analysis failed", raw },
        { status: 422 }
      );
    }

    // Save to food_logs
    const { data: logEntry, error: dbError } = await supabase
      .from("food_logs")
      .insert({
        user_id: user.id,
        meal_type: data.meal_type_guess,
        description: data.description,
        items: data.items,
        calories: data.total_calories,
        protein_g: data.total_protein_g,
        carbs_g: data.total_carbs_g,
        fat_g: data.total_fat_g,
        fiber_g: data.total_fiber_g,
        confidence: data.confidence,
        source: "photo",
        image_path: uploadError ? null : fileName,
        raw_ai_response: raw,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to save entry", details: dbError.message },
        { status: 500 }
      );
    }

    // Create memory episode (fire and forget)
    createMealEpisode(
      supabase,
      user.id,
      generateMealSummary(
        data.description,
        data.total_calories,
        data.total_protein_g,
        data.meal_type_guess,
        data.confidence
      ),
      {
        calories: data.total_calories,
        protein_g: data.total_protein_g,
        meal_type: data.meal_type_guess,
        items: data.items.map((i) => i.name),
      }
    ).catch((err) => console.error("Memory episode error:", err));

    return NextResponse.json({ entry: logEntry, analysis: data });
  } catch (err) {
    console.error("analyze-photo error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
