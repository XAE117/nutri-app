import { createClient } from "@/lib/supabase/server";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { MacroRings } from "@/components/dashboard/macro-rings";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { QuickRelog } from "@/components/food-log/quick-relog";
import { HowItWorksDialog } from "@/components/help/how-it-works-dialog";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user!.id)
    .single();

  if (profile && profile.onboarding_complete === false) {
    redirect("/onboarding");
  }

  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  // Parallel data fetch
  const [entriesRes, goalsRes, recentRes] = await Promise.all([
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
    // Recent unique meals for quick re-log (last 7 days, deduplicated by description)
    supabase
      .from("food_logs")
      .select("id, description, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, items, source")
      .eq("user_id", user!.id)
      .lt("logged_at", startOfDay)
      .order("logged_at", { ascending: false })
      .limit(20),
  ]);

  const logs = entriesRes.data ?? [];
  const goals = goalsRes.data;
  const recentAll = recentRes.data ?? [];

  // Deduplicate recent meals by description
  const seen = new Set<string>();
  const recentMeals = recentAll.filter((m) => {
    if (!m.description || seen.has(m.description)) return false;
    seen.add(m.description);
    return true;
  }).slice(0, 5);

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
    <div className="space-y-4">
      <InstallPrompt />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Today</h1>
          <HowItWorksDialog />
        </div>
        <div className="flex gap-2">
          <Link href="/gallery">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Gallery</Button>
          </Link>
          <Link href="/trends">
            <Button variant="outline" size="sm">Trends</Button>
          </Link>
          <Link href="/log/new">
            <Button size="sm" className="bg-[#6366f1] hover:bg-[#5558e6] text-white">Log Food</Button>
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

      {/* Macro ring charts when goals exist */}
      {(goals?.target_protein_g || goals?.target_carbs_g || goals?.target_fat_g) && (
        <MacroRings
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
          targetProtein={goals.target_protein_g ?? undefined}
          targetCarbs={goals.target_carbs_g ?? undefined}
          targetFat={goals.target_fat_g ?? undefined}
        />
      )}

      {/* Quick re-log from recent meals */}
      <QuickRelog meals={recentMeals} />

      {logs.length === 0 ? (
        <div className="py-8 text-center">
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
