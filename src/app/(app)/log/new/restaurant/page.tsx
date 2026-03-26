"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface RestaurantResult {
  name: string;
  brand: string | null;
  calories: number | null;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  serving: string;
  photo?: string;
  nixItemId?: string;
  source: "nutritionix_branded" | "nutritionix_common" | "local";
}

export default function RestaurantSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<RestaurantResult | null>(null);
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const router = useRouter();

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError("");
    setMessage("");
    setSelected(null);
    setNotConfigured(false);

    try {
      const res = await fetch(
        `/api/restaurant-search?q=${encodeURIComponent(query.trim())}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Search failed");
        return;
      }

      const data = await res.json();
      setResults(data.results ?? []);

      if (data.message) {
        setMessage(data.message);
        if (data.message.includes("Nutritionix API keys")) {
          setNotConfigured(true);
        }
      }

      if (data.results?.length === 0 && !data.message) {
        setError("No results found");
      }
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry() {
    if (!selected) return;
    setSaving(true);

    const mult = parseFloat(servings) || 1;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setSaving(false);
      return;
    }

    const cal = Math.round((selected.calories ?? 0) * mult);
    const protein = Math.round((selected.protein_g ?? 0) * mult * 10) / 10;
    const carbs = Math.round((selected.carbs_g ?? 0) * mult * 10) / 10;
    const fat = Math.round((selected.fat_g ?? 0) * mult * 10) / 10;

    const description = selected.brand
      ? `${selected.name} (${selected.brand})`
      : selected.name;

    const { error: dbError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      description,
      meal_type: "snack",
      items: [
        {
          name: selected.name,
          brand: selected.brand,
          quantity: mult,
          unit: selected.serving,
          calories: cal,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
        },
      ],
      calories: cal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: 0,
      confidence: 0.85,
      source: "restaurant",
    });

    if (dbError) {
      setError("Failed to save entry");
      setSaving(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Restaurant Search</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Search restaurants or menu items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "..." : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {notConfigured && results.length === 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">
              Full restaurant search requires Nutritionix API keys
            </p>
            <p className="text-sm text-muted-foreground">
              Without API keys, only a small set of common fast food items is
              searchable. To enable full restaurant menu search:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Sign up at{" "}
                <span className="font-mono text-xs">
                  developer.nutritionix.com
                </span>
              </li>
              <li>
                Add{" "}
                <span className="font-mono text-xs">NUTRITIONIX_APP_ID</span>{" "}
                and{" "}
                <span className="font-mono text-xs">NUTRITIONIX_APP_KEY</span>{" "}
                to your environment
              </li>
              <li>Redeploy or restart the dev server</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {message && !notConfigured && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      {selected ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              {selected.photo && (
                <img
                  src={selected.photo}
                  alt={selected.name}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
              <div>
                <p className="font-medium">{selected.name}</p>
                {selected.brand && (
                  <p className="text-sm text-muted-foreground">
                    {selected.brand}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Serving: {selected.serving}
                </p>
              </div>
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
                  {selected.calories != null
                    ? Math.round(selected.calories * (parseFloat(servings) || 1))
                    : "N/A"}
                </span>
              </div>
              <div>
                Protein:{" "}
                <span className="font-medium">
                  {selected.protein_g != null
                    ? `${Math.round(selected.protein_g * (parseFloat(servings) || 1) * 10) / 10}g`
                    : "N/A"}
                </span>
              </div>
              <div>
                Carbs:{" "}
                <span className="font-medium">
                  {selected.carbs_g != null
                    ? `${Math.round(selected.carbs_g * (parseFloat(servings) || 1) * 10) / 10}g`
                    : "N/A"}
                </span>
              </div>
              <div>
                Fat:{" "}
                <span className="font-medium">
                  {selected.fat_g != null
                    ? `${Math.round(selected.fat_g * (parseFloat(servings) || 1) * 10) / 10}g`
                    : "N/A"}
                </span>
              </div>
            </div>

            {selected.source === "nutritionix_common" && (
              <p className="text-xs text-muted-foreground">
                Detailed macros will be available after saving. Calorie count may
                be estimated.
              </p>
            )}

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
          {results.map((item, i) => (
            <Card
              key={`${item.name}-${item.brand}-${i}`}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => {
                setSelected(item);
                setServings("1");
              }}
            >
              <CardContent className="flex items-center gap-3 p-3">
                {item.photo && (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {item.brand && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.brand}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.calories != null ? `${item.calories} cal` : ""}
                    {item.protein_g != null ? ` | ${item.protein_g}g P` : ""}
                    {item.carbs_g != null ? ` | ${item.carbs_g}g C` : ""}
                    {item.fat_g != null ? ` | ${item.fat_g}g F` : ""}
                    {item.serving ? ` | ${item.serving}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
