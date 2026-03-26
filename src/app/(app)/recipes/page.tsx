"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Template {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export default function RecipesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      } else {
        setError("Failed to load recipes");
      }
    } catch {
      setError("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function logTemplate(id: string) {
    setLoggingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "POST" });
      if (res.ok) {
        loadTemplates();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to log meal");
      }
    } catch {
      setError("Failed to log meal");
    } finally {
      setLoggingId(null);
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete recipe");
      }
    } catch {
      setError("Failed to delete recipe");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString();
  }

  const mealLabels: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
    drink: "Drink",
    other: "Other",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <Link href="/recipes/new">
          <Button size="sm">New Recipe</Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && templates.length > 0 && (
        <Input
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No saved recipes yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save a meal from your food log to create your first recipe.
          </p>
          <Link href="/recipes/new">
            <Button variant="outline" className="mt-3">
              Create a Recipe
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            No recipes match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.meal_type && (
                      <p className="text-xs text-muted-foreground">
                        {mealLabels[template.meal_type] || template.meal_type}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-semibold">
                    {template.calories} cal
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="font-medium">{template.protein_g}g</p>
                    <p className="text-muted-foreground">Protein</p>
                  </div>
                  <div>
                    <p className="font-medium">{template.carbs_g}g</p>
                    <p className="text-muted-foreground">Carbs</p>
                  </div>
                  <div>
                    <p className="font-medium">{template.fat_g}g</p>
                    <p className="text-muted-foreground">Fat</p>
                  </div>
                  <div>
                    <p className="font-medium">{template.fiber_g}g</p>
                    <p className="text-muted-foreground">Fiber</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Used {template.use_count}{" "}
                    {template.use_count === 1 ? "time" : "times"}
                  </span>
                  <span>Last used: {formatDate(template.last_used_at)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={loggingId === template.id}
                    onClick={() => logTemplate(template.id)}
                  >
                    {loggingId === template.id ? "Logging..." : "Log This"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deletingId === template.id}
                    onClick={() => deleteTemplate(template.id)}
                  >
                    {deletingId === template.id ? "..." : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
