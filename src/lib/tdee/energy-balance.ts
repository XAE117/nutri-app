/**
 * TDEE estimation via energy balance method.
 *
 * TDEE = calories_in - (weight_change_rate_kg_per_day * 7700)
 * 7700 kcal ≈ energy density of 1 kg body weight change
 *
 * Bootstrap strategy:
 * - Days 1-7: Use Mifflin-St Jeor estimate
 * - Days 7-14: Blend MSJ + adaptive (weighted toward adaptive as data grows)
 * - Day 14+: Fully adaptive
 */

const ENERGY_DENSITY = 7700; // kcal per kg of body weight

export interface TDEEInput {
  avgCaloriesIn: number;
  weightChangeRateKgPerDay: number;
  daysOfData: number;
  mifflinEstimate: number | null;
}

export interface TDEEResult {
  estimatedTDEE: number;
  method: "mifflin" | "blended" | "adaptive";
  confidence: "low" | "medium" | "high";
  energyDelta: number; // kcal/day surplus or deficit
}

export function estimateTDEE(input: TDEEInput): TDEEResult {
  const adaptiveTDEE =
    input.avgCaloriesIn - input.weightChangeRateKgPerDay * ENERGY_DENSITY;

  if (input.daysOfData < 7 && input.mifflinEstimate) {
    return {
      estimatedTDEE: Math.round(input.mifflinEstimate),
      method: "mifflin",
      confidence: "low",
      energyDelta: Math.round(input.avgCaloriesIn - input.mifflinEstimate),
    };
  }

  if (input.daysOfData < 14 && input.mifflinEstimate) {
    const blendWeight = (input.daysOfData - 7) / 7; // 0 at day 7, 1 at day 14
    const blended =
      input.mifflinEstimate * (1 - blendWeight) +
      adaptiveTDEE * blendWeight;

    return {
      estimatedTDEE: Math.round(blended),
      method: "blended",
      confidence: "medium",
      energyDelta: Math.round(input.avgCaloriesIn - blended),
    };
  }

  return {
    estimatedTDEE: Math.round(adaptiveTDEE),
    method: "adaptive",
    confidence: input.daysOfData >= 21 ? "high" : "medium",
    energyDelta: Math.round(input.avgCaloriesIn - adaptiveTDEE),
  };
}

/**
 * Mifflin-St Jeor BMR estimate.
 * For males: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 5 (note: should be +5 for males)
 * For females: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 */
export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female",
  activityLevel: string
): number {
  const bmr =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (sex === "male" ? 5 : -161);

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * (multipliers[activityLevel] ?? 1.55));
}
