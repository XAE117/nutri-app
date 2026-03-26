export interface WeightPoint {
  date: string; // ISO date
  weight_kg: number;
}

/**
 * Exponentially Weighted Moving Average for weight smoothing.
 * alpha=0.1 gives ~10-day half-life, filtering out daily fluctuations.
 */
export function ewmaSmooth(
  points: WeightPoint[],
  alpha = 0.1
): { date: string; raw: number; trend: number }[] {
  if (points.length === 0) return [];

  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const result: { date: string; raw: number; trend: number }[] = [];
  let trend = sorted[0].weight_kg;

  for (const pt of sorted) {
    trend = alpha * pt.weight_kg + (1 - alpha) * trend;
    result.push({
      date: pt.date,
      raw: pt.weight_kg,
      trend: Math.round(trend * 100) / 100,
    });
  }

  return result;
}

/**
 * Calculate weight change rate in kg/day from smoothed trend.
 * Uses last N days of trend data.
 */
export function weightChangeRate(
  trendData: { date: string; trend: number }[],
  windowDays = 7
): number | null {
  if (trendData.length < 2) return null;

  const recent = trendData.slice(-windowDays);
  if (recent.length < 2) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const days =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
    (1000 * 60 * 60 * 24);

  if (days === 0) return null;

  return (last.trend - first.trend) / days;
}
