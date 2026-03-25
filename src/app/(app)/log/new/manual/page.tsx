"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManualEntryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const description = form.get("description") as string;
    const meal_type = form.get("meal_type") as string;
    const calories = parseFloat(form.get("calories") as string) || 0;
    const protein_g = parseFloat(form.get("protein_g") as string) || 0;
    const carbs_g = parseFloat(form.get("carbs_g") as string) || 0;
    const fat_g = parseFloat(form.get("fat_g") as string) || 0;
    const fiber_g = parseFloat(form.get("fiber_g") as string) || 0;
    const notes = form.get("notes") as string;

    if (!description.trim()) {
      setError("Description is required");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const items = [
      {
        name: description,
        quantity: 1,
        unit: "serving",
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
      },
    ];

    const { error: dbError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      meal_type,
      description,
      items,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      confidence: 1.0,
      source: "manual",
      verified: true,
      notes: notes || null,
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Manual Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">What did you eat?</Label>
          <Input
            id="description"
            name="description"
            placeholder="e.g., Grilled chicken with rice"
            required
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

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional notes..."
            rows={2}
          />
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
            {loading ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
