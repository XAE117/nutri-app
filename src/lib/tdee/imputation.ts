/**
 * Missing-day imputation for TDEE calculation.
 * - Weight: linear interpolation between known points
 * - Calories: impute as current TDEE estimate (neutral assumption)
 */

export interface DayData {
  date: string;
  weight_kg: number | null;
  calories_in: number | null;
}

/**
 * Fill missing weight values via linear interpolation.
 */
export function interpolateWeight(days: DayData[]): DayData[] {
  const result = [...days];
  let lastKnown: { idx: number; val: number } | null = null;

  for (let i = 0; i < result.length; i++) {
    if (result[i].weight_kg !== null) {
      if (lastKnown !== null && i - lastKnown.idx > 1) {
        // Fill gap between lastKnown and current
        const gap = i - lastKnown.idx;
        const diff = result[i].weight_kg! - lastKnown.val;
        for (let j = lastKnown.idx + 1; j < i; j++) {
          const fraction = (j - lastKnown.idx) / gap;
          result[j] = {
            ...result[j],
            weight_kg: Math.round((lastKnown.val + diff * fraction) * 100) / 100,
          };
        }
      }
      lastKnown = { idx: i, val: result[i].weight_kg! };
    }
  }

  return result;
}

/**
 * Fill missing calorie values with TDEE estimate (neutral assumption).
 */
export function imputeCalories(
  days: DayData[],
  tdeeEstimate: number
): DayData[] {
  return days.map((d) => ({
    ...d,
    calories_in: d.calories_in ?? tdeeEstimate,
  }));
}

/**
 * Calculate average calories over days that have data.
 */
export function averageCalories(days: DayData[]): number | null {
  const withData = days.filter((d) => d.calories_in !== null);
  if (withData.length === 0) return null;
  const sum = withData.reduce((acc, d) => acc + d.calories_in!, 0);
  return Math.round(sum / withData.length);
}
