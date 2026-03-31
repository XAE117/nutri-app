"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AnalyzingSkeleton } from "@/components/capture/analyzing-skeleton";
import { FoodEntryCard } from "@/components/food-log/food-entry-card";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image/compress";

type AnalysisState =
  | { status: "idle" }
  | { status: "captured"; file: File; preview: string }
  | { status: "compressing" }
  | { status: "analyzing" }
  | { status: "done"; entry: Record<string, unknown> }
  | { status: "error"; message: string };

export default function PhotoCapturePage() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [hint, setHint] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setState({ status: "captured", file, preview });
    },
    []
  );

  const handleRetake = useCallback(() => {
    setState({ status: "idle" });
    setHint("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (state.status !== "captured") return;
    const { file } = state;

    try {
      setState({ status: "compressing" });
      const compressed = await compressImage(file);

      setState({ status: "analyzing" });
      const formData = new FormData();
      formData.append("photo", compressed, "food.webp");
      if (hint.trim()) {
        formData.append("hint", hint.trim());
      }

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

      // Undo toast — gives 5s to reverse a mistaken log
      toast("Food logged!", {
        action: {
          label: "Undo",
          onClick: async () => {
            const entryId = data.entry?.id;
            if (!entryId) return;
            const { error } = await supabase
              .from("food_logs")
              .delete()
              .eq("id", entryId);
            if (error) {
              toast.error("Failed to undo");
            } else {
              toast("Entry removed");
              setState({ status: "idle" });
              setHint("");
            }
          },
        },
        duration: 5000,
      });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }, [state, hint, supabase]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Photo Analysis</h1>

      {/* Capture or Preview */}
      {state.status === "idle" && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square w-full max-w-sm mx-auto flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
          >
            <svg
              className="mb-2 h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <span className="text-sm text-muted-foreground">
              Tap to take a photo
            </span>
          </button>
        </>
      )}

      {state.status === "captured" && (
        <div className="space-y-3">
          <div className="relative w-full max-w-sm mx-auto">
            <img
              src={state.preview}
              alt="Food photo preview"
              className="w-full rounded-lg object-cover aspect-square"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-2 right-2"
              onClick={handleRetake}
            >
              Retake
            </Button>
          </div>

          {/* Description input with mic/dictation support */}
          <div className="space-y-1.5">
            <label htmlFor="food-hint" className="text-sm text-muted-foreground">
              What is this? (optional — helps AI accuracy)
            </label>
            <input
              id="food-hint"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder='e.g. "almond butter" or "leftover chicken pasta"'
              className="w-full rounded-md border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground/60">
              Tap the mic on your keyboard to dictate
            </p>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Analyze Food
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {state.status === "compressing" && <AnalyzingSkeleton step="compressing" />}

      {state.status === "analyzing" && <AnalyzingSkeleton step="analyzing" />}

      {state.status === "error" && (
        <div className="rounded-md bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleRetake}
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
              onClick={handleRetake}
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
