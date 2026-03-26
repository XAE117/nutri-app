import { SupabaseClient } from "@supabase/supabase-js";

export interface SemanticState {
  goal_type?: string;
  target_daily_calories?: number;
  rolling_7day?: {
    avg_calories: number;
    tracking_days: number;
    adherence_pct: number;
  };
  current_tdee_estimate?: number;
  weight_direction?: "losing" | "gaining" | "stable";
  tracking_momentum?: "strong" | "moderate" | "weak";
  food_preferences?: string[];
  common_skip_patterns?: string[];
  weeks_active?: number;
}

export async function getSemanticState(
  supabase: SupabaseClient,
  userId: string
): Promise<SemanticState> {
  const { data } = await supabase
    .from("ai_semantic_state")
    .select("state")
    .eq("user_id", userId)
    .single();

  return (data?.state as SemanticState) ?? {};
}

export async function updateSemanticState(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<SemanticState>
): Promise<void> {
  const current = await getSemanticState(supabase, userId);
  const merged = { ...current, ...updates };

  await supabase.from("ai_semantic_state").upsert(
    {
      user_id: userId,
      state: merged,
      version: (current as any)?.version ? (current as any).version + 1 : 1,
    },
    { onConflict: "user_id" }
  );
}

export async function refreshSemanticState(
  supabase: SupabaseClient,
  userId: string
): Promise<SemanticState> {
  // Compute fresh state from actual data
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [goalsRes, foodRes, weightRes, firstLogRes] = await Promise.all([
    supabase.from("user_goals").select("*").eq("user_id", userId).single(),
    supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("user_id", userId)
      .gte("logged_at", sevenDaysAgo.toISOString())
      .order("logged_at", { ascending: true }),
    supabase
      .from("weight_logs")
      .select("logged_at, weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(14),
    supabase
      .from("food_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const goals = goalsRes.data;
  const foods = foodRes.data ?? [];
  const weights = weightRes.data ?? [];

  // Rolling 7-day calories
  const dailyCals: Record<string, number> = {};
  for (const f of foods) {
    const day = f.logged_at.slice(0, 10);
    dailyCals[day] = (dailyCals[day] ?? 0) + (f.calories ?? 0);
  }
  const trackingDays = Object.keys(dailyCals).length;
  const totalCals = Object.values(dailyCals).reduce((s, c) => s + c, 0);
  const avgCalories = trackingDays > 0 ? Math.round(totalCals / trackingDays) : 0;

  // Weight direction
  let weightDirection: "losing" | "gaining" | "stable" = "stable";
  if (weights.length >= 3) {
    const recent = weights.slice(0, 3).reduce((s, w) => s + w.weight_kg, 0) / 3;
    const older = weights.slice(-3).reduce((s, w) => s + w.weight_kg, 0) / Math.min(3, weights.slice(-3).length);
    if (recent < older - 0.3) weightDirection = "losing";
    else if (recent > older + 0.3) weightDirection = "gaining";
  }

  // Weeks active
  const firstLog = firstLogRes.data?.[0];
  const weeksActive = firstLog
    ? Math.ceil((now.getTime() - new Date(firstLog.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  // Tracking momentum
  let momentum: "strong" | "moderate" | "weak" = "weak";
  if (trackingDays >= 6) momentum = "strong";
  else if (trackingDays >= 4) momentum = "moderate";

  const state: SemanticState = {
    goal_type: goals?.goal_type ?? "maintain",
    target_daily_calories: goals?.target_calories ?? undefined,
    rolling_7day: {
      avg_calories: avgCalories,
      tracking_days: trackingDays,
      adherence_pct: Math.round((trackingDays / 7) * 100),
    },
    weight_direction: weightDirection,
    tracking_momentum: momentum,
    weeks_active: weeksActive,
  };

  await updateSemanticState(supabase, userId, state);
  return state;
}
