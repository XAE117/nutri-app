"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DayMacros {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function TrendsPage() {
  const [weekData, setWeekData] = useState<DayMacros[]>([]);
  const [view, setView] = useState<"week" | "macros">("week");
  const [targetCalories, setTargetCalories] = useState<number | null>(null);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load goals for target
    const { data: goals } = await supabase
      .from("user_goals")
      .select("target_calories")
      .eq("user_id", user.id)
      .single();

    if (goals?.target_calories) {
      setTargetCalories(goals.target_calories);
    }

    // Last 7 days of food logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs } = await supabase
      .from("food_logs")
      .select("logged_at, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("logged_at", sevenDaysAgo.toISOString())
      .order("logged_at", { ascending: true });

    // Aggregate by day
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

    setWeekData(days.map((d) => ({
      ...dayMap[d],
      date: d.slice(5), // MM-DD
      protein: Math.round(dayMap[d].protein),
      carbs: Math.round(dayMap[d].carbs),
      fat: Math.round(dayMap[d].fat),
    })));
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Trends</h1>
        <div className="flex gap-1">
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            Calories
          </Button>
          <Button
            variant={view === "macros" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("macros")}
          >
            Macros
          </Button>
        </div>
      </div>

      {weekData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {view === "week" ? "Daily Calories (7 days)" : "Daily Macros (7 days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              {view === "week" ? (
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={45} stroke="rgba(255,255,255,0.06)" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1b2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e5e7eb" }} />
                  <Bar dataKey="calories" fill="#818cf8" name="Calories" radius={[4, 4, 0, 0]} />
                  {targetCalories && (
                    <Bar dataKey={() => targetCalories} fill="transparent" stroke="#f472b6" strokeDasharray="4 4" name="Target" />
                  )}
                </BarChart>
              ) : (
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} stroke="rgba(255,255,255,0.06)" />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={35} stroke="rgba(255,255,255,0.06)" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1b2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e5e7eb" }} />
                  <Legend />
                  <Bar dataKey="protein" fill="#5eead4" name="Protein (g)" stackId="macros" />
                  <Bar dataKey="carbs" fill="#fcd34d" name="Carbs (g)" stackId="macros" />
                  <Bar dataKey="fat" fill="#f472b6" name="Fat (g)" stackId="macros" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          No data yet. Start logging food to see trends.
        </div>
      )}

      {/* Weekly summary stats */}
      {weekData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Avg Calories</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    weekData.reduce((s, d) => s + d.calories, 0) /
                      weekData.filter((d) => d.calories > 0).length || 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Protein</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    weekData.reduce((s, d) => s + d.protein, 0) /
                      weekData.filter((d) => d.protein > 0).length || 0
                  )}g
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Carbs</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    weekData.reduce((s, d) => s + d.carbs, 0) /
                      weekData.filter((d) => d.carbs > 0).length || 0
                  )}g
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Fat</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    weekData.reduce((s, d) => s + d.fat, 0) /
                      weekData.filter((d) => d.fat > 0).length || 0
                  )}g
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
