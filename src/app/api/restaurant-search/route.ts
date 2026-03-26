import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Hardcoded common fast food items as fallback when no API key
const COMMON_ITEMS = [
  { name: "Big Mac", brand: "McDonald's", calories: 550, protein_g: 25, carbs_g: 45, fat_g: 30, serving: "1 sandwich (200g)" },
  { name: "Whopper", brand: "Burger King", calories: 657, protein_g: 28, carbs_g: 49, fat_g: 40, serving: "1 sandwich (291g)" },
  { name: "Crunchwrap Supreme", brand: "Taco Bell", calories: 530, protein_g: 16, carbs_g: 71, fat_g: 21, serving: "1 wrap (254g)" },
  { name: "Chicken McNuggets (10pc)", brand: "McDonald's", calories: 410, protein_g: 25, carbs_g: 26, fat_g: 24, serving: "10 pieces (162g)" },
  { name: "Baconator", brand: "Wendy's", calories: 940, protein_g: 57, carbs_g: 38, fat_g: 62, serving: "1 sandwich (310g)" },
  { name: "Original Chicken Sandwich", brand: "Chick-fil-A", calories: 440, protein_g: 28, carbs_g: 40, fat_g: 19, serving: "1 sandwich (200g)" },
  { name: "Spicy Chicken Sandwich", brand: "Chick-fil-A", calories: 450, protein_g: 28, carbs_g: 44, fat_g: 19, serving: "1 sandwich (209g)" },
  { name: "Quarter Pounder with Cheese", brand: "McDonald's", calories: 520, protein_g: 30, carbs_g: 42, fat_g: 26, serving: "1 sandwich (202g)" },
  { name: "Crunchy Taco", brand: "Taco Bell", calories: 170, protein_g: 8, carbs_g: 13, fat_g: 10, serving: "1 taco (78g)" },
  { name: "Burrito Bowl (Chicken)", brand: "Chipotle", calories: 665, protein_g: 52, carbs_g: 38, fat_g: 24, serving: "1 bowl (510g)" },
  { name: "Dave's Single", brand: "Wendy's", calories: 570, protein_g: 30, carbs_g: 39, fat_g: 34, serving: "1 sandwich (218g)" },
  { name: "Footlong Italian BMT", brand: "Subway", calories: 760, protein_g: 34, carbs_g: 82, fat_g: 34, serving: "1 sub (372g)" },
  { name: "Large Fries", brand: "McDonald's", calories: 480, protein_g: 7, carbs_g: 65, fat_g: 23, serving: "1 large (154g)" },
  { name: "Popcorn Chicken", brand: "KFC", calories: 390, protein_g: 19, carbs_g: 22, fat_g: 24, serving: "1 serving (114g)" },
  { name: "Double-Double", brand: "In-N-Out", calories: 670, protein_g: 37, carbs_g: 39, fat_g: 41, serving: "1 burger (330g)" },
  { name: "Pepperoni Pizza (2 slices)", brand: "Domino's", calories: 534, protein_g: 22, carbs_g: 60, fat_g: 22, serving: "2 slices (212g)" },
  { name: "McChicken", brand: "McDonald's", calories: 400, protein_g: 14, carbs_g: 40, fat_g: 21, serving: "1 sandwich (143g)" },
  { name: "Waffle Fries (Medium)", brand: "Chick-fil-A", calories: 420, protein_g: 5, carbs_g: 46, fat_g: 24, serving: "1 medium (125g)" },
  { name: "Bean Burrito", brand: "Taco Bell", calories: 380, protein_g: 13, carbs_g: 55, fat_g: 11, serving: "1 burrito (198g)" },
  { name: "Original Recipe Breast", brand: "KFC", calories: 390, protein_g: 39, carbs_g: 11, fat_g: 21, serving: "1 breast (176g)" },
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 requests per minute per user
  const { success: allowed } = rateLimit(`restaurant:${user.id}`, 30, 0.5);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429 }
    );
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const query = q.trim();

  // Try Nutritionix if configured
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_APP_KEY;

  if (appId && appKey) {
    try {
      const res = await fetch(
        `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`,
        {
          headers: {
            "x-app-id": appId,
            "x-app-key": appKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error("Nutritionix search failed:", res.status);
        // Fall through to local fallback
      } else {
        const data = await res.json();

        // Combine branded and common results
        const results = [
          ...(data.branded || []).map((item: Record<string, unknown>) => ({
            name: item.food_name as string,
            brand: item.brand_name as string,
            calories: Math.round(item.nf_calories as number),
            serving: `${item.serving_qty} ${item.serving_unit}`,
            photo: (item.photo as Record<string, string>)?.thumb,
            nixItemId: item.nix_item_id as string,
            source: "nutritionix_branded" as const,
          })),
          ...(data.common || []).map((item: Record<string, unknown>) => ({
            name: item.food_name as string,
            brand: null,
            calories: null, // Common items need a nutrients lookup
            serving: `${item.serving_qty} ${item.serving_unit}`,
            photo: (item.photo as Record<string, string>)?.thumb,
            tag: item.tag_id as string,
            source: "nutritionix_common" as const,
          })),
        ];

        return NextResponse.json({
          results,
          source: "nutritionix",
        });
      }
    } catch (err) {
      console.error("Nutritionix API error:", err);
      // Fall through to local fallback
    }
  }

  // Fallback: search hardcoded common items
  const lower = query.toLowerCase();
  const matches = COMMON_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(lower) ||
      item.brand.toLowerCase().includes(lower)
  );

  if (matches.length > 0) {
    return NextResponse.json({
      results: matches.map((item) => ({
        ...item,
        source: "local",
      })),
      source: "local",
    });
  }

  return NextResponse.json({
    results: [],
    source: appId && appKey ? "nutritionix" : "local",
    message: !appId || !appKey
      ? "Restaurant search requires Nutritionix API keys for full results. Set NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY in your environment."
      : "No results found",
  });
}
