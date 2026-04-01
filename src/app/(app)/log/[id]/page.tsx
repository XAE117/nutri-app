"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodItem } from "@/lib/schemas/food-log";

interface FoodLogEntry {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: string | null;
  description: string | null;
  items: FoodItem[];
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  confidence: number | null;
  source: string;
  image_path: string | null;
  verified: boolean;
  notes: string | null;
}

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [entry, setEntry] = useState<FoodLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("food_logs")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (data) {
      setEntry(data as FoodLogEntry);

      if (data.image_path) {
        const { data: urlData } = await supabase.storage
          .from("food-photos")
          .createSignedUrl(data.image_path, 3600);
        if (urlData) setImageUrl(urlData.signedUrl);
      }
    }
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!entry) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);

    const { error } = await supabase
      .from("food_logs")
      .update({
        description: form.get("description") as string,
        meal_type: form.get("meal_type") as string,
        calories: parseFloat(form.get("calories") as string) || 0,
        protein_g: parseFloat(form.get("protein_g") as string) || 0,
        carbs_g: parseFloat(form.get("carbs_g") as string) || 0,
        fat_g: parseFloat(form.get("fat_g") as string) || 0,
        fiber_g: parseFloat(form.get("fiber_g") as string) || 0,
        verified: true,
      })
      .eq("id", entry.id)
      .eq("user_id", entry.user_id);

    if (!error) {
      setEditing(false);
      await fetchEntry();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!entry) return;
    if (!confirm("Delete this entry?")) return;

    await supabase.from("food_logs").delete().eq("id", entry.id).eq("user_id", entry.user_id);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Entry not found.</p>
        <Button variant="outline" className="mt-3" onClick={() => router.push("/")}>
          Go back
        </Button>
      </div>
    );
  }

  const time = new Date(entry.logged_at).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          &larr; Back
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Food photo"
          className="w-full rounded-lg object-cover aspect-video"
        />
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{time}</span>
        {entry.confidence !== null && entry.confidence < 0.7 && (
          <Badge
            variant="outline"
            className="border-amber-400/50 bg-amber-500/10 text-amber-300"
          >
            Low confidence ({Math.round(entry.confidence * 100)}%)
          </Badge>
        )}
        {entry.verified && (
          <Badge variant="secondary">Verified</Badge>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={entry.description || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal_type">Meal Type</Label>
            <Select name="meal_type" defaultValue={entry.meal_type || "other"}>
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
              defaultValue={entry.calories ?? 0}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="protein_g">Protein (g)</Label>
              <Input
                id="protein_g"
                name="protein_g"
                type="number"
                step="0.1"
                defaultValue={entry.protein_g ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs_g">Carbs (g)</Label>
              <Input
                id="carbs_g"
                name="carbs_g"
                type="number"
                step="0.1"
                defaultValue={entry.carbs_g ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat_g">Fat (g)</Label>
              <Input
                id="fat_g"
                name="fat_g"
                type="number"
                step="0.1"
                defaultValue={entry.fat_g ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiber_g">Fiber (g)</Label>
              <Input
                id="fiber_g"
                name="fiber_g"
                type="number"
                step="0.1"
                defaultValue={entry.fiber_g ?? 0}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold">
              {entry.description || "Untitled"}
            </h2>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <div className="text-center rounded-lg bg-muted/50 p-2">
                <p className="text-lg font-bold tabular-nums text-brand">
                  {Math.round(entry.calories ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">cal</p>
              </div>
              <div className="text-center rounded-lg bg-muted/50 p-2">
                <p className="text-lg font-semibold tabular-nums" style={{ color: "#5eead4" }}>
                  {Math.round(entry.protein_g ?? 0)}
                  <span className="text-xs font-normal">g</span>
                </p>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div className="text-center rounded-lg bg-muted/50 p-2">
                <p className="text-lg font-semibold tabular-nums" style={{ color: "#fcd34d" }}>
                  {Math.round(entry.carbs_g ?? 0)}
                  <span className="text-xs font-normal">g</span>
                </p>
                <p className="text-xs text-muted-foreground">carbs</p>
              </div>
              <div className="text-center rounded-lg bg-muted/50 p-2">
                <p className="text-lg font-semibold tabular-nums" style={{ color: "#f472b6" }}>
                  {Math.round(entry.fat_g ?? 0)}
                  <span className="text-xs font-normal">g</span>
                </p>
                <p className="text-xs text-muted-foreground">fat</p>
              </div>
            </div>
          </div>

          {entry.items && entry.items.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Items
                </h3>
                <div className="space-y-2">
                  {entry.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          ({item.quantity} {item.unit})
                        </span>
                      </span>
                      <span className="tabular-nums">{item.calories} cal</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {entry.notes && (
            <>
              <Separator />
              <div>
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                  Notes
                </h3>
                <p className="text-sm">{entry.notes}</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
