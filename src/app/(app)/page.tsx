import { createClient } from "@/lib/supabase/server";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [entriesRes, goalsRes] = await Promise.all([
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user!.id)
      .gte("logged_at", startOfDay)
      .lt("logged_at", endOfDay)
      .order("logged_at", { ascending: false }),
    supabase
      .from("user_goals")
      .select("target_calories, target_protein_g, target_carbs_g, target_fat_g")
      .eq("user_id", user!.id)
      .single(),
  ]);

  const logs = entriesRes.data ?? [];
  const goals = goalsRes.data;

  const totals = logs.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories ?? 0),
      protein: acc.protein + (entry.protein_g ?? 0),
      carbs: acc.carbs + (entry.carbs_g ?? 0),
      fat: acc.fat + (entry.fat_g ?? 0),
      fiber: acc.fiber + (entry.fiber_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today</h1>
        <div className="flex gap-2">
          <Link href="/trends">
            <Button variant="outline" size="sm">Trends</Button>
          </Link>
          <Link href="/log/new">
            <Button size="sm">Log Food</Button>
          </Link>
        </div>
      </div>

      <DailySummary
        calories={totals.calories}
        protein={totals.protein}
        carbs={totals.carbs}
        fat={totals.fat}
        fiber={totals.fiber}
        entryCount={logs.length}
        targetCalories={goals?.target_calories ?? undefined}
        targetProtein={goals?.target_protein_g ?? undefined}
        targetCarbs={goals?.target_carbs_g ?? undefined}
        targetFat={goals?.target_fat_g ?? undefined}
      />

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
        <div className="space-y-2">
          {logs.map((entry) => (
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
      )}
    </div>
  );
}
