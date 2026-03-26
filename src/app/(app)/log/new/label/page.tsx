"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CameraCapture } from "@/components/capture/camera-capture";
import { AnalyzingSkeleton } from "@/components/capture/analyzing-skeleton";
import { compressImage } from "@/lib/image/compress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LabelResult {
  product_name: string;
  serving_size: string;
  servings_per_container: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
}

export default function LabelPage() {
  const [state, setState] = useState<
    "capture" | "analyzing" | "result" | "error"
  >("capture");
  const [result, setResult] = useState<LabelResult | null>(null);
  const [error, setError] = useState("");
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleCapture(file: File) {
    setState("analyzing");
    setError("");

    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("photo", compressed);

      const res = await fetch("/api/analyze-label", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Analysis failed");
        setState("error");
        return;
      }

      const data = await res.json();
      setResult(data);
      setState("result");
    } catch {
      setError("Something went wrong");
      setState("error");
    }
  }

  async function saveEntry() {
    if (!result) return;
    setSaving(true);

    const mult = parseFloat(servings) || 1;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: dbError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      description: result.product_name,
      meal_type: "snack",
      items: [
        {
          name: result.product_name,
          quantity: mult,
          unit: result.serving_size,
          calories: Math.round(result.calories * mult),
          protein_g: Math.round(result.protein_g * mult * 10) / 10,
          carbs_g: Math.round(result.carbs_g * mult * 10) / 10,
          fat_g: Math.round(result.fat_g * mult * 10) / 10,
          fiber_g: Math.round(result.fiber_g * mult * 10) / 10,
        },
      ],
      calories: Math.round(result.calories * mult),
      protein_g: Math.round(result.protein_g * mult * 10) / 10,
      carbs_g: Math.round(result.carbs_g * mult * 10) / 10,
      fat_g: Math.round(result.fat_g * mult * 10) / 10,
      fiber_g: Math.round(result.fiber_g * mult * 10) / 10,
      confidence: result.confidence,
      source: "label",
    });

    if (dbError) {
      setError("Failed to save");
      setSaving(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (state === "capture") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Scan Nutrition Label</h1>
        <p className="text-sm text-muted-foreground">
          Take a clear photo of the Nutrition Facts panel.
        </p>
        <CameraCapture onCapture={handleCapture} />
      </div>
    );
  }

  if (state === "analyzing") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Reading Label...</h1>
        <AnalyzingSkeleton />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Label Scan</h1>
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={() => setState("capture")}>Try Again</Button>
      </div>
    );
  }

  // result state
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Label Result</h1>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{result.product_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Serving: {result.serving_size}
              {result.servings_per_container &&
                ` (${result.servings_per_container} per container)`}
            </p>
            {result.confidence < 0.7 && (
              <p className="text-xs text-orange-500">
                Low confidence — please verify the numbers
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Servings eaten:</label>
              <Input
                type="number"
                step="0.5"
                min="0.25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                Calories:{" "}
                <span className="font-medium">
                  {Math.round(result.calories * (parseFloat(servings) || 1))}
                </span>
              </div>
              <div>
                Protein:{" "}
                <span className="font-medium">
                  {Math.round(result.protein_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
              <div>
                Carbs:{" "}
                <span className="font-medium">
                  {Math.round(result.carbs_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
              <div>
                Fat:{" "}
                <span className="font-medium">
                  {Math.round(result.fat_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
              <div>
                Fiber:{" "}
                <span className="font-medium">
                  {Math.round(result.fiber_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEntry} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Add to Log"}
              </Button>
              <Button variant="outline" onClick={() => setState("capture")}>
                Rescan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
