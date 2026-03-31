"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const messages = [
  "Identifying ingredients...",
  "Estimating portions...",
  "Calculating macros...",
  "Almost there...",
];

interface AnalyzingSkeletonProps {
  step?: "compressing" | "analyzing";
}

export function AnalyzingSkeleton({ step = "analyzing" }: AnalyzingSkeletonProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (step !== "analyzing") return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <Card>
      <CardHeader>
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-2">
          <StepDot active={step === "compressing"} completed={step === "analyzing"} label="Compress" />
          <div className="h-px flex-1 bg-muted" />
          <StepDot active={step === "analyzing"} completed={false} label="Analyze" />
          <div className="h-px flex-1 bg-muted" />
          <StepDot active={false} completed={false} label="Done" />
        </div>

        {/* Animated message */}
        <div className="flex items-center gap-2">
          <div className="relative h-5 w-5">
            <svg
              className="h-5 w-5 animate-spin text-brand"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-sm text-muted-foreground transition-opacity">
            {step === "compressing" ? "Compressing image..." : messages[msgIndex]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description placeholder */}
        <Skeleton className="h-5 w-3/4" />

        {/* Macro grid */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/50">
          Usually takes 3-10 seconds
        </p>
      </CardContent>
    </Card>
  );
}

function StepDot({
  active,
  completed,
  label,
}: {
  active: boolean;
  completed: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`h-2.5 w-2.5 rounded-full transition-colors ${
          completed
            ? "bg-glow-green"
            : active
              ? "bg-brand animate-pulse"
              : "bg-muted"
        }`}
      />
      <span className={`text-[10px] ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
