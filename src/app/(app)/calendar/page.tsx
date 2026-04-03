import { createClient } from "@/lib/supabase/server";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { month: monthParam } = await searchParams;

  // Parse month param or default to current month
  let year: number;
  let month: number; // 0-indexed
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }

  // Month boundaries
  const monthStart = `${year}-${pad(month + 1)}-01T00:00:00`;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const monthEnd = `${nextYear}-${pad(nextMonth + 1)}-01T00:00:00`;

  // Prev/next month links
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevParam = `${prevYear}-${pad(prevMonth + 1)}`;
  const nextParam = `${nextYear}-${pad(nextMonth + 1)}`;

  // Fetch all food_logs for the month + user goals in parallel
  const [logsRes, goalsRes] = await Promise.all([
    supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("user_id", user.id)
      .gte("logged_at", monthStart)
      .lt("logged_at", monthEnd),
    supabase
      .from("user_goals")
      .select("target_calories")
      .eq("user_id", user.id)
      .single(),
  ]);

  const logs = logsRes.data ?? [];
  const targetCalories = goalsRes.data?.target_calories ?? undefined;

  // Aggregate calories per day
  const dailyCalories: Record<string, number> = {};
  for (const log of logs) {
    const day = log.logged_at.slice(0, 10); // YYYY-MM-DD
    dailyCalories[day] = (dailyCalories[day] || 0) + (log.calories ?? 0);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="size-7" /> {/* Spacer for alignment */}
      </div>

      {/* Month navigation */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Link href={`/calendar?month=${prevParam}`}>
              <Button variant="ghost" size="icon-sm">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </Button>
            </Link>
            <span className="text-base font-medium">
              {monthNames[month]} {year}
            </span>
            <Link href={`/calendar?month=${nextParam}`}>
              <Button variant="ghost" size="icon-sm">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Button>
            </Link>
          </div>

          <CalendarGrid
            year={year}
            month={month}
            dailyCalories={dailyCalories}
            targetCalories={targetCalories}
          />

          {/* Legend */}
          {targetCalories && (
            <div className="flex items-center justify-center gap-4 mt-4 text-[0.65rem] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm bg-glow-green/40" />
                Under
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm bg-glow-amber/40" />
                On target
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-sm bg-glow-pink/40" />
                Over
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
