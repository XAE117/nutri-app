import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mifflinStJeor } from "@/lib/tdee/energy-balance";
import {
  recencyWeightedTrend,
  estimateAdaptiveTDEE,
  adherenceNeutralTarget,
  type DailyRecord,
} from "@/lib/tdee/adaptive";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look back 60 days so the recency-weighted trend smoother is well past its
  // transient and the back-solve has a representative window.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const today = new Date().toISOString().slice(0, 10);

  const [weightRes, goalsRes, foodRes, prevSnapRes] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("logged_at, weight_kg")
      .eq("user_id", user.id)
      .gte("logged_at", sixtyDaysAgo.toISOString().slice(0, 10))
      .order("logged_at", { ascending: true }),
    supabase.from("user_goals").select("*").eq("user_id", user.id).single(),
    supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("user_id", user.id)
      .gte("logged_at", sixtyDaysAgo.toISOString())
      .order("logged_at", { ascending: true }),
    // Most recent prior snapshot powers carry-forward through logging gaps.
    supabase
      .from("tdee_snapshots")
      .select("estimated_tdee, snapshot_date")
      .eq("user_id", user.id)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1),
  ]);

  const weights = weightRes.data ?? [];
  const goals = goalsRes.data;
  const foodLogs = foodRes.data ?? [];
  const previousTDEE = prevSnapRes.data?.[0]?.estimated_tdee ?? null;

  if (weights.length < 2) {
    return NextResponse.json({
      tdee: null,
      message: "Need at least 2 weight entries to estimate TDEE",
      weightData: [],
    });
  }

  // Aggregate logged intake per calendar day.
  const dailyCalories: Record<string, number> = {};
  for (const log of foodLogs) {
    const day = log.logged_at.slice(0, 10);
    dailyCalories[day] = (dailyCalories[day] ?? 0) + (log.calories ?? 0);
  }

  const weightByDay: Record<string, number> = {};
  for (const w of weights) {
    weightByDay[w.logged_at] = w.weight_kg;
  }

  // Build a contiguous daily series. Missing weigh-ins -> null (interpolated
  // by the smoother); missing intake -> null (excluded, never zero-filled).
  const startDate = new Date(weights[0].logged_at);
  const endDate = new Date(weights[weights.length - 1].logged_at);
  const records: DailyRecord[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    records.push({
      date: iso,
      weightKg: weightByDay[iso] ?? null,
      caloriesIn: dailyCalories[iso] ?? null,
    });
  }

  const trendPoints = recencyWeightedTrend(records);

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

  const est = estimateAdaptiveTDEE(records, {
    previousTDEE,
    mifflinEstimate,
  });

  const weightData = trendPoints.map((p) => ({
    date: p.date,
    raw: p.rawWeightKg ?? p.trendWeightKg,
    trend: p.trendWeightKg,
  }));

  if (!est) {
    return NextResponse.json({
      tdee: null,
      message: "Not enough data for adaptive TDEE yet",
      weightData,
      mifflinEstimate,
    });
  }

  const avgCalories = Math.round(est.estimatedTDEE + est.energyDelta);

  // Adherence-neutral daily target: a pure function of TDEE + goal rate.
  // No rollover, no "make-up" for prior over-target days.
  const goalRate =
    (goals?.goal_rate_kg_per_week as number | undefined) ?? 0;
  const { dailyTarget: recommendedDailyTarget } = adherenceNeutralTarget({
    tdee: est.estimatedTDEE,
    goalRateKgPerWeek: goalRate,
  });

  // Persist a snapshot (also the seed for tomorrow's carry-forward).
  const latestTrend = trendPoints[trendPoints.length - 1];
  await supabase.from("tdee_snapshots").upsert(
    {
      user_id: user.id,
      snapshot_date: today,
      trend_weight_kg: latestTrend.trendWeightKg,
      raw_weight_kg: latestTrend.rawWeightKg ?? latestTrend.trendWeightKg,
      calories_in: avgCalories,
      estimated_tdee: est.estimatedTDEE,
      weight_change_rate: est.slopeKgPerDay ?? 0,
      energy_delta: est.energyDelta,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  return NextResponse.json({
    tdee: {
      estimatedTDEE: est.estimatedTDEE,
      method: est.method,
      confidence: est.confidence,
      energyDelta: est.energyDelta,
    },
    weightData,
    mifflinEstimate,
    avgCalories,
    daysOfData: records.length,
    coverage: est.coverage,
    recommendedDailyTarget,
  });
}
