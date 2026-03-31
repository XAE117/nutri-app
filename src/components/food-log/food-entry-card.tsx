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

const mealTypeColors: Record<string, string> = {
  breakfast: "bg-glow-amber",
  lunch: "bg-glow-green",
  dinner: "bg-glow-indigo",
  snack: "bg-glow-pink",
  drink: "bg-glow-teal",
  other: "bg-muted-foreground",
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
  const barColor = meal_type ? mealTypeColors[meal_type] || "bg-muted-foreground" : "bg-muted-foreground";

  return (
    <Link href={`/log/${id}`}>
      <Card className="transition-colors hover:bg-white/[0.06] overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Meal type color bar */}
            <div className={`w-1 shrink-0 ${barColor}`} />

            <div className="flex-1 p-4">
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
                  <p className="text-xl font-bold tabular-nums text-brand">
                    {calories ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span style={{ color: "#5eead4" }}>P: {protein_g ?? 0}g</span>
                <span style={{ color: "#fcd34d" }}>C: {carbs_g ?? 0}g</span>
                <span style={{ color: "#f472b6" }}>F: {fat_g ?? 0}g</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
