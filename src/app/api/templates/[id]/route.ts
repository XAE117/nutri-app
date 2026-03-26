import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, items } =
    body;

  const { data: template, error } = await supabase
    .from("meal_templates")
    .update({
      name: name?.trim(),
      description: description ?? null,
      meal_type: meal_type ?? null,
      calories: calories ?? 0,
      protein_g: protein_g ?? 0,
      carbs_g: carbs_g ?? 0,
      fat_g: fat_g ?? 0,
      fiber_g: fiber_g ?? 0,
      items: items ?? [],
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("meal_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** "Use template" — logs a food entry from the template and increments use_count */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the template
  const { data: template, error: fetchError } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Create a food_log entry from the template
  const { error: insertError } = await supabase.from("food_logs").insert({
    user_id: user.id,
    description: template.name,
    meal_type: template.meal_type || "other",
    calories: template.calories,
    protein_g: template.protein_g,
    carbs_g: template.carbs_g,
    fat_g: template.fat_g,
    fiber_g: template.fiber_g,
    items: template.items || [],
    confidence: 1.0,
    source: "template",
    verified: true,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Increment use_count and update last_used_at
  const { error: updateError } = await supabase
    .from("meal_templates")
    .update({
      use_count: (template.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to update template use_count:", updateError);
  }

  return NextResponse.json({ success: true, logged: true });
}
