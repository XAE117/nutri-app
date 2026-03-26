"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [unitSystem, setUnitSystem] = useState("metric");

  // Goal fields
  const [goalType, setGoalType] = useState("maintain");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [ratePerWeek, setRatePerWeek] = useState("0.5");
  const [activityLevel, setActivityLevel] = useState("moderate");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");
      setDisplayName(user.user_metadata?.display_name || "");

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setHeightCm(profile.height_cm?.toString() || "");
        setAge(profile.age?.toString() || "");
        setSex(profile.sex || "");
        setUnitSystem(profile.unit_system || "metric");
      }

      // Load goals
      const { data: goals } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (goals) {
        setGoalType(goals.goal_type || "maintain");
        setTargetWeight(goals.target_weight_kg?.toString() || "");
        setTargetCalories(goals.target_calories?.toString() || "");
        setTargetProtein(goals.target_protein_g?.toString() || "");
        setTargetCarbs(goals.target_carbs_g?.toString() || "");
        setTargetFat(goals.target_fat_g?.toString() || "");
        setRatePerWeek(goals.rate_per_week_kg?.toString() || "0.5");
        setActivityLevel(goals.activity_level || "moderate");
      }
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Update profile
    await supabase
      .from("profiles")
      .update({
        height_cm: heightCm ? parseFloat(heightCm) : null,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        unit_system: unitSystem,
      })
      .eq("id", user.id);

    // Upsert goals
    const goalsData = {
      user_id: user.id,
      goal_type: goalType,
      target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
      target_calories: targetCalories ? parseInt(targetCalories) : null,
      target_protein_g: targetProtein ? parseInt(targetProtein) : null,
      target_carbs_g: targetCarbs ? parseInt(targetCarbs) : null,
      target_fat_g: targetFat ? parseInt(targetFat) : null,
      rate_per_week_kg: parseFloat(ratePerWeek) || 0.5,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      age: age ? parseInt(age) : null,
      sex: sex || null,
      activity_level: activityLevel,
    };

    await supabase
      .from("user_goals")
      .upsert(goalsData, { onConflict: "user_id" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{displayName || "\u2014"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Height (cm)</Label>
              <Input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
              />
            </div>
            <div>
              <Label className="text-xs">Age</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sex</Label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Units</Label>
              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="metric">Metric (kg)</option>
                <option value="imperial">Imperial (lbs)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Goal</Label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="lose">Lose weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain weight</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Activity Level</Label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Target Weight ({unitSystem === "imperial" ? "lbs" : "kg"})
              </Label>
              <Input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Rate (kg/week)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="1"
                value={ratePerWeek}
                onChange={(e) => setRatePerWeek(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Daily Calorie Target</Label>
            <Input
              type="number"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
              placeholder="2000"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Protein (g)</Label>
              <Input
                type="number"
                value={targetProtein}
                onChange={(e) => setTargetProtein(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Carbs (g)</Label>
              <Input
                type="number"
                value={targetCarbs}
                onChange={(e) => setTargetCarbs(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Fat (g)</Label>
              <Input
                type="number"
                value={targetFat}
                onChange={(e) => setTargetFat(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
      </Button>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <a href="/api/export?type=food_logs&format=csv" download>
              <Button variant="outline" size="sm" className="w-full">
                Food Logs (CSV)
              </Button>
            </a>
            <a href="/api/export?type=weight_logs&format=csv" download>
              <Button variant="outline" size="sm" className="w-full">
                Weight (CSV)
              </Button>
            </a>
            <a href="/api/export?type=food_logs&format=json" download>
              <Button variant="outline" size="sm" className="w-full">
                Food Logs (JSON)
              </Button>
            </a>
            <a href="/api/export?type=weight_logs&format=json" download>
              <Button variant="outline" size="sm" className="w-full">
                Weight (JSON)
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            NutriLens uses AI to analyze food photos and track nutrition. AI
            estimates are not a substitute for professional dietary advice.
          </p>
          <Separator />
          <p className="text-xs text-muted-foreground">
            This app provides general wellness information only. It does not
            diagnose, treat, cure, or prevent any disease. Consult a healthcare
            professional for personalized nutrition guidance.
          </p>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
