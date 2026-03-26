"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewRecipePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const description = form.get("description") as string;
    const meal_type = form.get("meal_type") as string;
    const calories = parseFloat(form.get("calories") as string) || 0;
    const protein_g = parseFloat(form.get("protein_g") as string) || 0;
    const carbs_g = parseFloat(form.get("carbs_g") as string) || 0;
    const fat_g = parseFloat(form.get("fat_g") as string) || 0;
    const fiber_g = parseFloat(form.get("fiber_g") as string) || 0;

    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          meal_type: meal_type || null,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          fiber_g,
          items: [
            {
              name,
              quantity: 1,
              unit: "serving",
              calories,
              protein_g,
              carbs_g,
              fat_g,
              fiber_g,
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save recipe");
        setLoading(false);
        return;
      }

      router.push("/recipes");
      router.refresh();
    } catch {
      setError("Failed to save recipe");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Recipe</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Recipe Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g., Morning Protein Bowl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            name="description"
            placeholder="e.g., Greek yogurt with berries and granola"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meal_type">Meal Type</Label>
          <Select name="meal_type" defaultValue="lunch">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
              <SelectItem value="drink">Drink</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="calories">Calories</Label>
          <Input
            id="calories"
            name="calories"
            type="number"
            min="0"
            step="1"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="protein_g">Protein (g)</Label>
            <Input
              id="protein_g"
              name="protein_g"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbs_g">Carbs (g)</Label>
            <Input
              id="carbs_g"
              name="carbs_g"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat_g">Fat (g)</Label>
            <Input
              id="fat_g"
              name="fat_g"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiber_g">Fiber (g)</Label>
            <Input
              id="fiber_g"
              name="fiber_g"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Saving..." : "Save Recipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
