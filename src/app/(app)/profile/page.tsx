"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ─── Coaching Types ───
interface Review {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  insights: { observation: string; category: string }[];
  recommendations: { suggestion: string; priority: string }[];
  metrics: Record<string, unknown>;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "account";
  const supabase = createClient();

  // ─── Account state ───
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  // ─── Profile state ───
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [unitSystem, setUnitSystem] = useState("imperial");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // ─── Goals state ───
  const [goalType, setGoalType] = useState("maintain");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [ratePerWeek, setRatePerWeek] = useState("1");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [savingGoals, setSavingGoals] = useState(false);
  const [savedGoals, setSavedGoals] = useState(false);

  // ─── Coaching state ───
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Load data ───
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");
      setDisplayName(user.user_metadata?.display_name || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        const isImp = (profile.unit_system || "imperial") === "imperial";
        setHeightCm(
          profile.height_cm
            ? (isImp ? Math.round(profile.height_cm / 2.54) : profile.height_cm).toString()
            : ""
        );
        setAge(profile.age?.toString() || "");
        setSex(profile.sex || "");
        setUnitSystem(profile.unit_system || "imperial");
      }

      const { data: goals } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (goals) {
        const isImp = ((profile as { unit_system?: string })?.unit_system || "imperial") === "imperial";
        setGoalType(goals.goal_type || "maintain");
        setTargetWeight(
          goals.target_weight_kg
            ? (isImp ? Math.round(goals.target_weight_kg * 2.20462 * 10) / 10 : goals.target_weight_kg).toString()
            : ""
        );
        setTargetCalories(goals.target_calories?.toString() || "");
        setTargetProtein(goals.target_protein_g?.toString() || "");
        setTargetCarbs(goals.target_carbs_g?.toString() || "");
        setTargetFat(goals.target_fat_g?.toString() || "");
        setRatePerWeek(
          goals.rate_per_week_kg
            ? (isImp ? Math.round(goals.rate_per_week_kg * 2.20462 * 10) / 10 : goals.rate_per_week_kg).toString()
            : "1"
        );
        setActivityLevel(goals.activity_level || "moderate");
      }
    }
    load();
  }, [supabase]);

  // ─── Load coaching reviews ───
  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch("/api/coaching/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } catch {
      setCoachError("Failed to load reviews");
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // ─── Save handlers ───
  async function saveProfile() {
    setSavingProfile(true);
    setSavedProfile(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isImperial = unitSystem === "imperial";
    const heightCmVal = heightCm
      ? Math.round((isImperial ? parseFloat(heightCm) * 2.54 : parseFloat(heightCm)) * 10) / 10
      : null;

    await supabase
      .from("profiles")
      .update({
        height_cm: heightCmVal,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        unit_system: unitSystem,
      })
      .eq("id", user.id);

    setSavingProfile(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function saveGoals() {
    setSavingGoals(true);
    setSavedGoals(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isImperial = unitSystem === "imperial";
    const targetWeightKg = targetWeight
      ? Math.round((isImperial ? parseFloat(targetWeight) * 0.453592 : parseFloat(targetWeight)) * 100) / 100
      : null;
    const rateKg = isImperial
      ? Math.round((parseFloat(ratePerWeek) || 0.5) * 0.453592 * 100) / 100
      : parseFloat(ratePerWeek) || 0.5;

    await supabase.from("user_goals").upsert(
      {
        user_id: user.id,
        goal_type: goalType,
        target_weight_kg: targetWeightKg,
        target_calories: targetCalories ? parseInt(targetCalories) : null,
        target_protein_g: targetProtein ? parseInt(targetProtein) : null,
        target_carbs_g: targetCarbs ? parseInt(targetCarbs) : null,
        target_fat_g: targetFat ? parseInt(targetFat) : null,
        rate_per_week_kg: rateKg,
        height_cm: heightCm
          ? Math.round((isImperial ? parseFloat(heightCm) * 2.54 : parseFloat(heightCm)) * 10) / 10
          : null,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        activity_level: activityLevel,
      },
      { onConflict: "user_id" }
    );

    setSavingGoals(false);
    setSavedGoals(true);
    setTimeout(() => setSavedGoals(false), 2000);
  }

  async function generateReview() {
    setGenerating(true);
    setCoachError("");
    try {
      const res = await fetch("/api/coaching/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCoachError(data.error || "Failed to generate review");
        return;
      }
      loadReviews();
    } catch {
      setCoachError("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="goals">Goals & Body</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
        </TabsList>

        {/* ═══ Account Tab ═══ */}
        <TabsContent value="account">
          <div className="space-y-4 pt-2">
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

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Data</CardTitle>
              </CardHeader>
              <CardContent>
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
        </TabsContent>

        {/* ═══ Goals & Body Tab ═══ */}
        <TabsContent value="goals">
          <div className="space-y-4 pt-2">
            {/* Profile / Body */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">
                      Height ({unitSystem === "imperial" ? "in" : "cm"})
                    </Label>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder={unitSystem === "imperial" ? "70" : "175"}
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
                    <Select value={sex} onValueChange={(v) => setSex(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="\u2014" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Units</Label>
                    <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v ?? "imperial")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">Metric (kg)</SelectItem>
                        <SelectItem value="imperial">Imperial (lbs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  size="sm"
                  className="w-full"
                >
                  {savingProfile ? "Saving..." : savedProfile ? "Saved" : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nutrition Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Goal</Label>
                    <Select value={goalType} onValueChange={(v) => setGoalType(v ?? "maintain")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lose">Lose weight</SelectItem>
                        <SelectItem value="maintain">Maintain</SelectItem>
                        <SelectItem value="gain">Gain weight</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Activity Level</Label>
                    <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v ?? "moderate")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="very_active">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label className="text-xs">
                      Rate ({unitSystem === "imperial" ? "lbs" : "kg"}/week)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2"
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

                <Button
                  onClick={saveGoals}
                  disabled={savingGoals}
                  size="sm"
                  className="w-full"
                >
                  {savingGoals ? "Saving..." : savedGoals ? "Saved" : "Save Goals"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Coaching Tab ═══ */}
        <TabsContent value="coaching">
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">AI nutrition coaching</p>
              <Button onClick={generateReview} disabled={generating} size="sm">
                {generating ? "Generating..." : "New Review"}
              </Button>
            </div>

            {coachError && <p className="text-sm text-destructive">{coachError}</p>}

            {loadingReviews ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No coaching reviews yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Log food for a week, then generate your first review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === review.id ? null : review.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Week of {review.week_start}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {expandedId === review.id ? "Collapse" : "Expand"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.summary}
                      </p>
                    </CardHeader>

                    {expandedId === review.id && (
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Summary</p>
                          <p className="text-sm">{review.summary}</p>
                        </div>

                        {review.insights?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Observations</p>
                            <ul className="mt-1 space-y-1">
                              {review.insights.map((ins, i) => (
                                <li key={i} className="text-sm">
                                  <span className="text-xs text-muted-foreground">
                                    [{ins.category}]
                                  </span>{" "}
                                  {ins.observation}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {review.recommendations?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Suggestions</p>
                            <ul className="mt-1 space-y-1">
                              {review.recommendations.map((rec, i) => (
                                <li key={i} className="text-sm">
                                  {rec.suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {review.metrics && (
                          <div className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Week Metrics
                            </p>
                            <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                              {Object.entries(review.metrics).map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-muted-foreground">
                                    {k.replace(/_/g, " ")}:
                                  </span>{" "}
                                  {String(v)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
