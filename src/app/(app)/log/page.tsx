import { createClient } from "@/lib/supabase/server";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
        <EmptyState
          icon={
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          }
          title="No entries yet today"
          description="Log your first meal to start tracking today's nutrition."
          action={
            <Link href="/log/new/photo">
              <Button>Take a food photo</Button>
            </Link>
          }
        />
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
