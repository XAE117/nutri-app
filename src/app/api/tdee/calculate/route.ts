import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ewmaSmooth, weightChangeRate } from "@/lib/tdee/ewma";
import { estimateTDEE, mifflinStJeor } from "@/lib/tdee/energy-balance";
import { interpolateWeight, averageCalories, type DayData } from "@/lib/tdee/imputation";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch weight logs (last 60 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [weightRes, goalsRes, foodRes] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("logged_at, weight_kg")
      .eq("user_id", user.id)
      .gte("logged_at", sixtyDaysAgo.toISOString().slice(0, 10))
      .order("logged_at", { ascending: true }),
    supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("user_id", user.id)
      .gte("logged_at", sixtyDaysAgo.toISOString())
      .order("logged_at", { ascending: true }),
  ]);

  const weights = weightRes.data ?? [];
  const goals = goalsRes.data;
  const foodLogs = foodRes.data ?? [];

  if (weights.length < 2) {
    return NextResponse.json({
      tdee: null,
      message: "Need at least 2 weight entries to estimate TDEE",
      weightData: [],
    });
  }

  // Build day-by-day data
  const dailyCalories: Record<string, number> = {};
  for (const log of foodLogs) {
    const day = log.logged_at.slice(0, 10);
    dailyCalories[day] = (dailyCalories[day] ?? 0) + (log.calories ?? 0);
  }

  const weightByDay: Record<string, number> = {};
  for (const w of weights) {
    weightByDay[w.logged_at] = w.weight_kg;
  }

  // Build array of all days in range
  const startDate = new Date(weights[0].logged_at);
  const endDate = new Date(weights[weights.length - 1].logged_at);
  const days: DayData[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      weight_kg: weightByDay[iso] ?? null,
      calories_in: dailyCalories[iso] ?? null,
    });
  }

  // Impute + smooth
  const interpolated = interpolateWeight(days);
  const weightPoints = interpolated
    .filter((d) => d.weight_kg !== null)
    .map((d) => ({ date: d.date, weight_kg: d.weight_kg! }));

  const trendData = ewmaSmooth(weightPoints);
  const changeRate = weightChangeRate(trendData);
  const avgCal = averageCalories(interpolated);

  // Mifflin-St Jeor estimate if we have profile data
  let mifflinEstimate: number | null = null;
  if (goals?.height_cm && goals?.age && goals?.sex) {
    const latestWeight = weights[weights.length - 1].weight_kg;
    mifflinEstimate = mifflinStJeor(
      latestWeight,
      goals.height_cm,
      goals.age,
      goals.sex,
      goals.activity_level || "moderate"
    );
  }

  if (changeRate === null || avgCal === null) {
    return NextResponse.json({
      tdee: mifflinEstimate ? { estimatedTDEE: mifflinEstimate, method: "mifflin", confidence: "low", energyDelta: 0 } : null,
      message: "Not enough data for adaptive TDEE yet",
      weightData: trendData,
      mifflinEstimate,
    });
  }

  const tdee = estimateTDEE({
    avgCaloriesIn: avgCal,
    weightChangeRateKgPerDay: changeRate,
    daysOfData: days.length,
    mifflinEstimate,
  });

  // Save snapshot
  const today = new Date().toISOString().slice(0, 10);
  const latestTrend = trendData[trendData.length - 1];

  await supabase.from("tdee_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: today,
      trend_weight_kg: latestTrend.trend,
      raw_weight_kg: latestTrend.raw,
      calories_in: avgCal,
      estimated_tdee: tdee.estimatedTDEE,
      weight_change_rate: changeRate,
      energy_delta: tdee.energyDelta,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  return NextResponse.json({
    tdee,
    weightData: trendData,
    mifflinEstimate,
    avgCalories: avgCal,
    daysOfData: days.length,
  });
}
