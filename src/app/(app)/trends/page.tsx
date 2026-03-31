"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";

interface DayMacros {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface WeightEntry {
  id: string;
  logged_at: string;
  weight_kg: number;
  notes: string | null;
}

interface TDEEData {
  tdee: {
    estimatedTDEE: number;
    method: string;
    confidence: string;
    energyDelta: number;
  } | null;
  weightData: { date: string; raw: number; trend: number }[];
  mifflinEstimate: number | null;
  avgCalories?: number;
  daysOfData?: number;
  message?: string;
}

export default function TrendsPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "calories";
  const supabase = createClient();

  // ─── Calorie/Macro state ───
  const [weekData, setWeekData] = useState<DayMacros[]>([]);
  const [targetCalories, setTargetCalories] = useState<number | null>(null);

  // ─── Weight state ───
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [weightDate, setWeightDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [weightNotes, setWeightNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [weightError, setWeightError] = useState("");
  const [useImperial, setUseImperial] = useState(true);
  const [tdeeData, setTdeeData] = useState<TDEEData | null>(null);

  const loadCalorieData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goals } = await supabase
      .from("user_goals")
      .select("target_calories")
      .eq("user_id", user.id)
      .single();

    if (goals?.target_calories) {
      setTargetCalories(goals.target_calories);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs } = await supabase
      .from("food_logs")
      .select("logged_at, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("logged_at", sevenDaysAgo.toISOString())
      .order("logged_at", { ascending: true });

    const dayMap: Record<string, DayMacros> = {};
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push(iso);
      dayMap[iso] = { date: iso, calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    for (const log of logs ?? []) {
      const day = log.logged_at.slice(0, 10);
      if (dayMap[day]) {
        dayMap[day].calories += log.calories ?? 0;
        dayMap[day].protein += log.protein_g ?? 0;
        dayMap[day].carbs += log.carbs_g ?? 0;
        dayMap[day].fat += log.fat_g ?? 0;
      }
    }

    setWeekData(
      days.map((d) => ({
        ...dayMap[d],
        date: d.slice(5),
        protein: Math.round(dayMap[d].protein),
        carbs: Math.round(dayMap[d].carbs),
        fat: Math.round(dayMap[d].fat),
      }))
    );
  }, [supabase]);

  const loadWeightData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("unit_system")
      .eq("id", user.id)
      .single();

    if (profile?.unit_system === "metric") {
      setUseImperial(false);
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", sixtyDaysAgo.toISOString().slice(0, 10))
      .order("logged_at", { ascending: true });

    setWeightEntries(data ?? []);

    try {
      const res = await fetch("/api/tdee/calculate");
      if (res.ok) {
        setTdeeData(await res.json());
      }
    } catch {
      // TDEE is optional
    }
  }, [supabase]);

  useEffect(() => {
    loadCalorieData();
    loadWeightData();
  }, [loadCalorieData, loadWeightData]);

  // ─── Weight helpers ───
  async function handleWeightSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    setWeightError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let weightKg = parseFloat(weight);
    if (useImperial) {
      weightKg = weightKg * 0.453592;
    }

    const { error: dbError } = await supabase.from("weight_logs").upsert(
      {
        user_id: user.id,
        logged_at: weightDate,
        weight_kg: Math.round(weightKg * 100) / 100,
        notes: weightNotes || null,
      },
      { onConflict: "user_id,logged_at" }
    );

    if (dbError) {
      setWeightError(dbError.message);
    } else {
      setWeight("");
      setWeightNotes("");
      loadWeightData();
    }
    setSaving(false);
  }

  const kgToDisplay = (kg: number) =>
    useImperial
      ? Math.round(kg * 2.20462 * 10) / 10
      : Math.round(kg * 10) / 10;

  const unit = useImperial ? "lbs" : "kg";

  const weightChartData = (tdeeData?.weightData ?? []).map((d) => ({
    date: d.date.slice(5),
    raw: kgToDisplay(d.raw),
    trend: kgToDisplay(d.trend),
  }));

  // ─── Averages (used in calories/macros tabs) ───
  const daysWithData = weekData.filter((d) => d.calories > 0);
  const avgCalories = daysWithData.length
    ? Math.round(
        weekData.reduce((s, d) => s + d.calories, 0) / daysWithData.length
      )
    : 0;
  const avgProtein = daysWithData.length
    ? Math.round(
        weekData.reduce((s, d) => s + d.protein, 0) /
          weekData.filter((d) => d.protein > 0).length
      )
    : 0;
  const avgCarbs = daysWithData.length
    ? Math.round(
        weekData.reduce((s, d) => s + d.carbs, 0) /
          weekData.filter((d) => d.carbs > 0).length
      )
    : 0;
  const avgFat = daysWithData.length
    ? Math.round(
        weekData.reduce((s, d) => s + d.fat, 0) /
          weekData.filter((d) => d.fat > 0).length
      )
    : 0;

  const hasNutritionData = weekData.length > 0 && daysWithData.length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Trends</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          <TabsTrigger value="calories">Calories</TabsTrigger>
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
        </TabsList>

        {/* ═══ Calories Tab ═══ */}
        <TabsContent value="calories">
          <div className="space-y-4">
            {hasNutritionData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Daily Calories (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={weekData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          width={45}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e1b2e",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            color: "#e5e7eb",
                          }}
                        />
                        <Bar
                          dataKey="calories"
                          fill="var(--glow-indigo)"
                          name="Calories"
                          radius={[4, 4, 0, 0]}
                        />
                        {targetCalories && (
                          <ReferenceLine
                            y={targetCalories}
                            stroke="#f472b6"
                            strokeDasharray="4 4"
                            label={{
                              value: "Target",
                              fill: "#f472b6",
                              fontSize: 11,
                              position: "right",
                            }}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">7-Day Averages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg Calories</p>
                        <p className="text-lg font-semibold">{avgCalories}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Protein</p>
                        <p className="text-lg font-semibold">{avgProtein}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Carbs</p>
                        <p className="text-lg font-semibold">{avgCarbs}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Fat</p>
                        <p className="text-lg font-semibold">{avgFat}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState
                icon={
                  <svg
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                }
                title="No calorie data yet"
                description="Log food for a few days and your calorie trends will appear here."
              />
            )}
          </div>
        </TabsContent>

        {/* ═══ Macros Tab ═══ */}
        <TabsContent value="macros">
          <div className="space-y-4">
            {hasNutritionData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Daily Macros (7 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={weekData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          width={35}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e1b2e",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            color: "#e5e7eb",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="protein"
                          fill="#5eead4"
                          name="Protein (g)"
                          stackId="macros"
                        />
                        <Bar
                          dataKey="carbs"
                          fill="#fcd34d"
                          name="Carbs (g)"
                          stackId="macros"
                        />
                        <Bar
                          dataKey="fat"
                          fill="#f472b6"
                          name="Fat (g)"
                          stackId="macros"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">7-Day Averages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Avg Protein</p>
                        <p className="text-lg font-semibold">{avgProtein}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Carbs</p>
                        <p className="text-lg font-semibold">{avgCarbs}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Fat</p>
                        <p className="text-lg font-semibold">{avgFat}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Calories</p>
                        <p className="text-lg font-semibold">{avgCalories}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState
                icon={
                  <svg
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                }
                title="No macro data yet"
                description="Log food for a few days and your macro breakdown will appear here."
              />
            )}
          </div>
        </TabsContent>

        {/* ═══ Weight Tab ═══ */}
        <TabsContent value="weight">
          <div className="space-y-4">
            {/* Log weight form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Log Weight</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseImperial(!useImperial)}
                  >
                    {useImperial ? "Switch to kg" : "Switch to lbs"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWeightSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder={`Weight (${unit})`}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                    />
                    <Input
                      type="date"
                      value={weightDate}
                      onChange={(e) => setWeightDate(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={weightNotes}
                    onChange={(e) => setWeightNotes(e.target.value)}
                  />
                  {weightError && (
                    <p className="text-sm text-destructive">{weightError}</p>
                  )}
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Log Weight"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* TDEE card */}
            {tdeeData?.tdee && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">TDEE Estimate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-bold">
                    {tdeeData.tdee.estimatedTDEE} kcal/day
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Method: {tdeeData.tdee.method} | Confidence:{" "}
                    {tdeeData.tdee.confidence}
                  </p>
                  <p className="text-sm">
                    {tdeeData.tdee.energyDelta > 0
                      ? `Surplus: +${tdeeData.tdee.energyDelta} kcal/day`
                      : `Deficit: ${tdeeData.tdee.energyDelta} kcal/day`}
                  </p>
                  {tdeeData.avgCalories && (
                    <p className="text-sm text-muted-foreground">
                      Avg intake: {tdeeData.avgCalories} kcal |{" "}
                      {tdeeData.daysOfData} days of data
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {tdeeData?.message && !tdeeData.tdee && (
              <p className="text-sm text-muted-foreground">
                {tdeeData.message}
              </p>
            )}

            {/* Weight chart */}
            {weightChartData.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weight Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weightChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        width={40}
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1b2e",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          color: "#e5e7eb",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="raw"
                        stroke="#5eead4"
                        strokeWidth={1}
                        dot={{ r: 3, fill: "#5eead4" }}
                        name={`Raw (${unit})`}
                      />
                      <Line
                        type="monotone"
                        dataKey="trend"
                        stroke="var(--glow-indigo)"
                        strokeWidth={2}
                        dot={false}
                        name={`Trend (${unit})`}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent entries */}
            {weightEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weightEntries
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {e.logged_at}
                          </span>
                          <span className="font-medium">
                            {kgToDisplay(e.weight_kg)} {unit}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {weightEntries.length === 0 && !tdeeData && (
              <EmptyState
                icon={
                  <svg
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
                    />
                  </svg>
                }
                title="No weight data yet"
                description="Log your weight above and track your trend over time."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
