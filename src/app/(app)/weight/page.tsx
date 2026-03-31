"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

export default function WeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useImperial, setUseImperial] = useState(true);
  const [tdeeData, setTdeeData] = useState<TDEEData | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile for unit preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("unit_system")
      .eq("id", user.id)
      .single();

    if (profile?.unit_system === "metric") {
      setUseImperial(false);
    }

    // Load weight entries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60);

    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", thirtyDaysAgo.toISOString().slice(0, 10))
      .order("logged_at", { ascending: true });

    setEntries(data ?? []);

    // Load TDEE
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
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    setError("");

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
        logged_at: date,
        weight_kg: Math.round(weightKg * 100) / 100,
        notes: notes || null,
      },
      { onConflict: "user_id,logged_at" }
    );

    if (dbError) {
      setError(dbError.message);
    } else {
      setWeight("");
      setNotes("");
      loadData();
    }
    setSaving(false);
  }

  const kgToDisplay = (kg: number) =>
    useImperial ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10;

  const unit = useImperial ? "lbs" : "kg";

  const chartData = (tdeeData?.weightData ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    raw: kgToDisplay(d.raw),
    trend: kgToDisplay(d.trend),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Weight</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUseImperial(!useImperial)}
        >
          {useImperial ? "Switch to kg" : "Switch to lbs"}
        </Button>
      </div>

      {/* Log weight */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-36"
              />
            </div>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
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
              Method: {tdeeData.tdee.method} | Confidence: {tdeeData.tdee.confidence}
            </p>
            <p className="text-sm">
              {tdeeData.tdee.energyDelta > 0
                ? `Surplus: +${tdeeData.tdee.energyDelta} kcal/day`
                : `Deficit: ${tdeeData.tdee.energyDelta} kcal/day`}
            </p>
            {tdeeData.avgCalories && (
              <p className="text-sm text-muted-foreground">
                Avg intake: {tdeeData.avgCalories} kcal | {tdeeData.daysOfData} days of data
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tdeeData?.message && !tdeeData.tdee && (
        <p className="text-sm text-muted-foreground">{tdeeData.message}</p>
      )}

      {/* Weight chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} stroke="rgba(255,255,255,0.06)" />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  width={40}
                  stroke="rgba(255,255,255,0.06)"
                />
                <Tooltip contentStyle={{ backgroundColor: "#1e1b2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#e5e7eb" }} />
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
                  stroke="#818cf8"
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
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries
                .slice()
                .reverse()
                .slice(0, 10)
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{e.logged_at}</span>
                    <span className="font-medium">
                      {kgToDisplay(e.weight_kg)} {unit}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
