import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: templates, error } = await supabase
    .from("meal_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("use_count", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, items } =
    body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("meal_templates")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description || null,
      meal_type: meal_type || null,
      calories: calories || 0,
      protein_g: protein_g || 0,
      carbs_g: carbs_g || 0,
      fat_g: fat_g || 0,
      fiber_g: fiber_g || 0,
      items: items || [],
      use_count: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
