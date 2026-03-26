import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFood } from "@/lib/nutrition/usda";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const foods = await searchFood(query.trim());
    return NextResponse.json({ foods });
  } catch (err) {
    console.error("USDA search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 502 }
    );
  }
}
