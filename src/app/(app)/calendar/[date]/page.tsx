import { createClient } from "@/lib/supabase/server";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CalendarDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect("/calendar");
  }

  const startOfDay = `${date}T00:00:00`;
  const [y, m, d] = date.split("-").map(Number);
  const nextDay = new Date(y, m - 1, d + 1);
  const endOfDay = `${nextDay.getFullYear()}-${(nextDay.getMonth() + 1).toString().padStart(2, "0")}-${nextDay.getDate().toString().padStart(2, "0")}T00:00:00`;

  const { data: entries } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", user.id)
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

  // Totals
  const totals = logs.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories ?? 0),
      protein: acc.protein + (entry.protein_g ?? 0),
      carbs: acc.carbs + (entry.carbs_g ?? 0),
      fat: acc.fat + (entry.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Format display date
  const displayDate = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Back to calendar month
  const monthParam = `${y}-${m.toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/calendar?month=${monthParam}`}>
          <Button variant="ghost" size="icon-sm">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
        </Link>
        <h1 className="text-base font-semibold">{displayDate}</h1>
        <div className="size-7" />
      </div>

      {/* Daily totals */}
      {logs.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="font-semibold tabular-nums text-brand">
            {totals.calories} cal
          </span>
          <span style={{ color: "#5eead4" }} className="tabular-nums">
            P: {totals.protein}g
          </span>
          <span style={{ color: "#fcd34d" }} className="tabular-nums">
            C: {totals.carbs}g
          </span>
          <span style={{ color: "#f472b6" }} className="tabular-nums">
            F: {totals.fat}g
          </span>
        </div>
      )}

      {/* Entries */}
      {logs.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          title="No entries"
          description={`Nothing logged on ${displayDate}.`}
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
