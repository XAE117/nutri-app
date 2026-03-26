"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface FoodResult {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType: string;
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  servingSize?: number;
  servingSizeUnit?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError("");
    setSelected(null);

    try {
      const res = await fetch(
        `/api/search-food?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) {
        setError("Search failed");
        return;
      }
      const data = await res.json();
      setResults(data.foods ?? []);
      if (data.foods?.length === 0) setError("No results found");
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!selected) return;
    setSaving(true);

    const mult = parseFloat(servings) || 1;
    const n = selected.nutrients;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const servingLabel = selected.servingSize
      ? `${selected.servingSize}${selected.servingSizeUnit || "g"}`
      : "serving";

    const { error: dbError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      description: selected.description,
      meal_type: "snack",
      items: [
        {
          name: selected.description,
          quantity: mult,
          unit: servingLabel,
          calories: Math.round(n.calories * mult),
          protein_g: Math.round(n.protein_g * mult * 10) / 10,
          carbs_g: Math.round(n.carbs_g * mult * 10) / 10,
          fat_g: Math.round(n.fat_g * mult * 10) / 10,
          fiber_g: Math.round(n.fiber_g * mult * 10) / 10,
        },
      ],
      calories: Math.round(n.calories * mult),
      protein_g: Math.round(n.protein_g * mult * 10) / 10,
      carbs_g: Math.round(n.carbs_g * mult * 10) / 10,
      fat_g: Math.round(n.fat_g * mult * 10) / 10,
      fiber_g: Math.round(n.fiber_g * mult * 10) / 10,
      confidence: 0.9,
      source: "usda",
    });

    if (dbError) {
      setError("Failed to save");
      setSaving(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Search Food</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Search foods (e.g. chicken breast)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "..." : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selected ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="font-medium">{selected.description}</p>
              {selected.brandName && (
                <p className="text-sm text-muted-foreground">
                  {selected.brandName}
                </p>
              )}
              {selected.servingSize && (
                <p className="text-sm text-muted-foreground">
                  Serving: {selected.servingSize}
                  {selected.servingSizeUnit || "g"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Servings:</label>
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
                  {Math.round(selected.nutrients.calories * (parseFloat(servings) || 1))}
                </span>
              </div>
              <div>
                Protein:{" "}
                <span className="font-medium">
                  {Math.round(selected.nutrients.protein_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
              <div>
                Carbs:{" "}
                <span className="font-medium">
                  {Math.round(selected.nutrients.carbs_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
              <div>
                Fat:{" "}
                <span className="font-medium">
                  {Math.round(selected.nutrients.fat_g * (parseFloat(servings) || 1) * 10) / 10}g
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEntry} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Add to Log"}
              </Button>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((food) => (
            <Card
              key={food.fdcId}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => {
                setSelected(food);
                setServings("1");
              }}
            >
              <CardContent className="p-3">
                <p className="text-sm font-medium">{food.description}</p>
                {food.brandName && (
                  <p className="text-xs text-muted-foreground">
                    {food.brandName}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {food.nutrients.calories} cal | {food.nutrients.protein_g}g P |{" "}
                  {food.nutrients.carbs_g}g C | {food.nutrients.fat_g}g F
                  {food.servingSize
                    ? ` | per ${food.servingSize}${food.servingSizeUnit || "g"}`
                    : " | per 100g"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
