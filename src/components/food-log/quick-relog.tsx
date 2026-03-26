"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecentMeal {
  id: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  meal_type: string;
  items: unknown[];
  source: string;
}

interface QuickRelogProps {
  meals: RecentMeal[];
}

export function QuickRelog({ meals }: QuickRelogProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  if (meals.length === 0) return null;

  async function relog(meal: RecentMeal) {
    setSaving(meal.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("food_logs").insert({
      user_id: user.id,
      description: meal.description,
      meal_type: meal.meal_type,
      items: meal.items,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
      confidence: 0.95,
      source: "quick_relog",
    });

    setSaving(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Re-log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="flex items-center justify-between rounded-md border p-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{meal.description}</p>
              <p className="text-xs text-muted-foreground">
                {meal.calories} cal | {Math.round(meal.protein_g)}g P
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => relog(meal)}
              disabled={saving === meal.id}
              className="ml-2 shrink-0"
            >
              {saving === meal.id ? "..." : "+"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
