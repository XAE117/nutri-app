"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Goals
  const [goalType, setGoalType] = useState("maintain");
  const [targetWeight, setTargetWeight] = useState("");

  // Step 2: Profile
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");

  // Step 3: Activity
  const [activityLevel, setActivityLevel] = useState("moderate");

  async function handleFinish() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Save profile
    await supabase
      .from("profiles")
      .update({
        height_cm: heightCm ? parseFloat(heightCm) : null,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    // Save goals
    await supabase.from("user_goals").upsert(
      {
        user_id: user.id,
        goal_type: goalType,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        activity_level: activityLevel,
      },
      { onConflict: "user_id" }
    );

    // Log initial weight if provided
    if (currentWeight) {
      await supabase.from("weight_logs").upsert(
        {
          user_id: user.id,
          logged_at: new Date().toISOString().slice(0, 10),
          weight_kg: parseFloat(currentWeight),
        },
        { onConflict: "user_id,logged_at" }
      );
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Step {step} of 3</p>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What's your goal?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "lose", label: "Lose weight", desc: "Gradual, sustainable fat loss" },
              { value: "maintain", label: "Maintain weight", desc: "Track nutrition, stay balanced" },
              { value: "gain", label: "Gain weight", desc: "Build muscle, increase intake" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoalType(opt.value)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  goalType === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}

            {goalType !== "maintain" && (
              <div className="pt-2">
                <Label className="text-sm">Target weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
            )}

            <Button onClick={() => setStep(2)} className="w-full">
              Next
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Current weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
            <div>
              <Label className="text-sm">Height (cm)</Label>
              <Input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Age</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Sex</Label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">--</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { value: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
              { value: "light", label: "Lightly active", desc: "Light exercise 1-3 days/week" },
              { value: "moderate", label: "Moderately active", desc: "Moderate exercise 3-5 days/week" },
              { value: "active", label: "Active", desc: "Hard exercise 6-7 days/week" },
              { value: "very_active", label: "Very active", desc: "Athlete or physical job" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActivityLevel(opt.value)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  activityLevel === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </button>
            ))}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleFinish} disabled={saving} className="flex-1">
                {saving ? "Setting up..." : "Get Started"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        This app provides general wellness information only. It does not diagnose,
        treat, cure, or prevent any disease.
      </p>
    </div>
  );
}
