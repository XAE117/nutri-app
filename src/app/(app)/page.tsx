import { createClient } from "@/lib/supabase/server";
import { DailySummary } from "@/components/dashboard/daily-summary";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { JaelModeToggle } from "@/components/dashboard/jael-mode-toggle";
import { MacroRings } from "@/components/dashboard/macro-rings";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { QuickRelog } from "@/components/food-log/quick-relog";
import { HowItWorksDialog } from "@/components/help/how-it-works-dialog";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { JaelHide } from "@/components/providers/jael-mode-provider";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
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
      .eq("user_id", user.id)
      .gte("logged_at", startOfDay)
      .lt("logged_at", endOfDay)
      .order("logged_at", { ascending: false }),
    supabase
      .from("user_goals")
      .select("target_calories, target_protein_g, target_carbs_g, target_fat_g")
      .eq("user_id", user.id)
      .single(),
    // Recent unique meals for quick re-log (last 7 days, deduplicated by description)
    supabase
      .from("food_logs")
      .select("id, description, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, items, source")
      .eq("user_id", user.id)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Calendar"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
          </Link>
          <HowItWorksDialog />
          <JaelModeToggle />
        </div>
      </div>

      {/* Calorie + Macro Card */}
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

      {/* Macro ring charts */}
      <JaelHide>
        {(totals.protein + totals.carbs + totals.fat > 0 || goals?.target_protein_g || goals?.target_carbs_g || goals?.target_fat_g) && (
          <MacroRings
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
            targetProtein={goals?.target_protein_g ?? undefined}
            targetCarbs={goals?.target_carbs_g ?? undefined}
            targetFat={goals?.target_fat_g ?? undefined}
          />
        )}
      </JaelHide>

      {/* Quick nav — Gallery & Recipes */}
      <DashboardActions />

      {/* Quick re-log from recent meals */}
      <JaelHide>
        <QuickRelog meals={recentMeals} />
      </JaelHide>

      {/* Food entries */}
      {logs.length === 0 ? (
        <Link href="/log/new/photo" className="flex flex-col items-center justify-center py-6 text-center group">
          <div className="mb-2 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Take a Photo</p>
          <p className="mt-1 text-xs text-muted-foreground/60">No entries yet today</p>
        </Link>
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

      {/* Install prompt — subtle, at bottom */}
      <InstallPrompt />
    </div>
  );
}
