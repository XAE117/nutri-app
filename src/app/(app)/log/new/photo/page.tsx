"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture } from "@/components/capture/camera-capture";
import { AnalyzingSkeleton } from "@/components/capture/analyzing-skeleton";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image/compress";

type AnalysisState =
  | { status: "idle" }
  | { status: "compressing" }
  | { status: "analyzing" }
  | { status: "done"; entry: Record<string, unknown> }
  | { status: "error"; message: string };

export default function PhotoCapturePage() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const router = useRouter();

  const handleCapture = useCallback(
    async (file: File) => {
      try {
        setState({ status: "compressing" });
        const compressed = await compressImage(file);

        setState({ status: "analyzing" });
        const formData = new FormData();
        formData.append("photo", compressed, "food.webp");

        const res = await fetch("/api/analyze-photo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setState({ status: "error", message: data.error || "Analysis failed" });
          return;
        }

        setState({ status: "done", entry: data.entry });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Photo Analysis</h1>

      <CameraCapture
        onCapture={handleCapture}
        disabled={state.status === "compressing" || state.status === "analyzing"}
      />

      {state.status === "compressing" && (
        <p className="text-center text-sm text-muted-foreground">
          Compressing image...
        </p>
      )}

      {state.status === "analyzing" && <AnalyzingSkeleton />}

      {state.status === "error" && (
        <div className="rounded-md bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setState({ status: "idle" })}
          >
            Try again
          </Button>
        </div>
      )}

      {state.status === "done" && state.entry && (
        <div className="space-y-3">
          <FoodEntryCard
            id={state.entry.id as string}
            description={state.entry.description as string}
            meal_type={state.entry.meal_type as string}
            calories={state.entry.calories as number}
            protein_g={state.entry.protein_g as number}
            carbs_g={state.entry.carbs_g as number}
            fat_g={state.entry.fat_g as number}
            confidence={state.entry.confidence as number}
            source={state.entry.source as string}
            logged_at={state.entry.logged_at as string}
            items={(state.entry.items as Array<Record<string, unknown>>) as never}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setState({ status: "idle" })}
            >
              Log another
            </Button>
            <Button className="flex-1" onClick={() => router.push("/")}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
