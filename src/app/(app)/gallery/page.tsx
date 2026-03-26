"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FoodPhoto {
  id: string;
  description: string | null;
  calories: number | null;
  logged_at: string;
  image_path: string;
}

interface GalleryItem extends FoodPhoto {
  signedUrl: string;
}

const PAGE_SIZE = 20;

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createClient();

  const fetchPhotos = useCallback(
    async (offset: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: logs } = await supabase
        .from("food_logs")
        .select("id, description, calories, logged_at, image_path")
        .eq("user_id", user.id)
        .not("image_path", "is", null)
        .order("logged_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (!logs || logs.length === 0) {
        setHasMore(false);
        return [];
      }

      if (logs.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Generate signed URLs for each image
      const withUrls: GalleryItem[] = [];
      for (const log of logs) {
        const { data: urlData } = await supabase.storage
          .from("food-photos")
          .createSignedUrl(log.image_path!, 3600);

        if (urlData) {
          withUrls.push({
            ...(log as FoodPhoto),
            signedUrl: urlData.signedUrl,
          });
        }
      }

      return withUrls;
    },
    [supabase]
  );

  useEffect(() => {
    async function initialLoad() {
      setLoading(true);
      const photos = await fetchPhotos(0);
      setItems(photos);
      setLoading(false);
    }
    initialLoad();
  }, [fetchPhotos]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const photos = await fetchPhotos(items.length);
    setItems((prev) => [...prev, ...photos]);
    setLoadingMore(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Photo Gallery</h1>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Photo Gallery</h1>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No food photos yet.</p>
          <Link href="/log/new/photo">
            <Button variant="outline" className="mt-3">
              Take your first food photo
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Photo Gallery</h1>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <Link key={item.id} href={`/log/${item.id}`}>
            <Card className="group relative overflow-hidden p-0">
              <img
                src={item.signedUrl}
                alt={item.description || "Food photo"}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                <p className="truncate text-xs font-medium text-white">
                  {item.description || "Untitled"}
                </p>
                <div className="flex items-center justify-between text-[10px] text-white/80">
                  <span>
                    {item.calories != null
                      ? `${Math.round(item.calories)} cal`
                      : "--"}
                  </span>
                  <span>{formatDate(item.logged_at)}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
