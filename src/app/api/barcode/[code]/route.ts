import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupBarcode } from "@/lib/nutrition/openfoodfacts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  if (!code || !/^\d{8,14}$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const result = await lookupBarcode(code);

  if (!result.found || !result.product) {
    return NextResponse.json(
      { error: result.error || "Product not found" },
      { status: 404 }
    );
  }

  const p = result.product;
  const n = p.nutriments;

  // Prefer per-serving values, fall back to per-100g
  const nutrition = {
    name: [p.product_name, p.brands].filter(Boolean).join(" - "),
    serving_size: p.serving_size || "100g",
    calories: Math.round(n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0),
    protein_g: Math.round((n.proteins_serving ?? n.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((n.fat_serving ?? n.fat_100g ?? 0) * 10) / 10,
    fiber_g: Math.round((n.fiber_serving ?? n.fiber_100g ?? 0) * 10) / 10,
    image_url: p.image_url,
  };

  return NextResponse.json(nutrition);
}
