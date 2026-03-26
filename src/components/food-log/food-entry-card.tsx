"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FoodItem } from "@/lib/schemas/food-log";

interface FoodEntryCardProps {
  id: string;
  description: string | null;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  confidence: number | null;
  source: string;
  logged_at: string;
  items: FoodItem[];
}

const mealTypeLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
  other: "Other",
};

export function FoodEntryCard({
  id,
  description,
  meal_type,
  calories,
  protein_g,
  carbs_g,
  fat_g,
  confidence,
  source,
  logged_at,
  items,
}: FoodEntryCardProps) {
  const time = new Date(logged_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const showConfidenceWarning = confidence !== null && confidence < 0.7;

  return (
    <Link href={`/log/${id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{time}</span>
                {meal_type && (
                  <Badge variant="secondary" className="text-xs">
                    {mealTypeLabels[meal_type] || meal_type}
                  </Badge>
                )}
                {showConfidenceWarning && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/50 bg-amber-500/10 text-xs text-amber-300"
                  >
                    Low confidence
                  </Badge>
                )}
                {source !== "photo" && (
                  <Badge variant="outline" className="text-xs">
                    {source}
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate font-medium">
                {description || "Untitled entry"}
              </p>
              {items.length > 0 && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {items.map((item) => item.name).join(", ")}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold tabular-nums">
                {calories ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">cal</p>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>P: {protein_g ?? 0}g</span>
            <span>C: {carbs_g ?? 0}g</span>
            <span>F: {fat_g ?? 0}g</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
