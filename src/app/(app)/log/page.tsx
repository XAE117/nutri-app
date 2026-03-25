import { createClient } from "@/lib/supabase/server";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function FoodLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: entries } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", user!.id)
    .gte("logged_at", startOfDay)
    .lt("logged_at", endOfDay)
    .order("logged_at", { ascending: true });

  const logs = entries ?? [];

  // Group by meal type
  const grouped: Record<string, typeof logs> = {};
  for (const entry of logs) {
    const key = entry.meal_type || "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  }

  const mealOrder = ["breakfast", "lunch", "dinner", "snack", "drink", "other"];
  const mealLabels: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snacks",
    drink: "Drinks",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Food Log</h1>
        <Link href="/log/new">
          <Button size="sm">Add</Button>
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No entries yet today.</p>
          <Link href="/log/new/photo">
            <Button variant="outline" className="mt-3">
              Take a food photo
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {mealOrder
            .filter((meal) => grouped[meal])
            .map((meal) => (
              <div key={meal}>
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                  {mealLabels[meal]}
                </h2>
                <div className="space-y-2">
                  {grouped[meal].map((entry) => (
                    <FoodEntryCard
                      key={entry.id}
                      id={entry.id}
                      description={entry.description}
                      meal_type={entry.meal_type}
                      calories={entry.calories}
                      protein_g={entry.protein_g}
                      carbs_g={entry.carbs_g}
                      fat_g={entry.fat_g}
                      confidence={entry.confidence}
                      source={entry.source}
                      logged_at={entry.logged_at}
                      items={entry.items ?? []}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
