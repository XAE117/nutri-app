"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Review {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  insights: { observation: string; category: string }[];
  recommendations: { suggestion: string; priority: string }[];
  metrics: Record<string, unknown>;
  created_at: string;
}

export default function CoachingPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coaching/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } catch {
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function generateReview() {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/coaching/generate", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate review");
        return;
      }

      loadReviews();
    } catch {
      setError("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coaching</h1>
        <Button onClick={generateReview} disabled={generating} size="sm">
          {generating ? "Generating..." : "New Review"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No coaching reviews yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Log food for a week, then generate your first review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === review.id ? null : review.id)
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Week of {review.week_start}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {expandedId === review.id ? "Collapse" : "Expand"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {review.summary}
                </p>
              </CardHeader>

              {expandedId === review.id && (
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Summary</p>
                    <p className="text-sm">{review.summary}</p>
                  </div>

                  {review.insights?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Observations</p>
                      <ul className="mt-1 space-y-1">
                        {review.insights.map((ins, i) => (
                          <li key={i} className="text-sm">
                            <span className="text-xs text-muted-foreground">
                              [{ins.category}]
                            </span>{" "}
                            {ins.observation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.recommendations?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Suggestions</p>
                      <ul className="mt-1 space-y-1">
                        {review.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm">
                            {rec.suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.metrics && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Week Metrics
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(review.metrics).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-muted-foreground">
                              {k.replace(/_/g, " ")}:
                            </span>{" "}
                            {String(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
