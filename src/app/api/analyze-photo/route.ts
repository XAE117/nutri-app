import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFood } from "@/lib/ai/vision";

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

    // Analyze with Claude Vision
    const { data, error, raw } = await analyzeFood(base64, mediaType);

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

    return NextResponse.json({ entry: logEntry, analysis: data });
  } catch (err) {
    console.error("analyze-photo error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
