/**
 * Adherence-neutral adaptive TDEE engine.
 *
 * Design principles (all enforced by the unit tests in ./adaptive.test.ts):
 *
 *  1. ADHERENCE-NEUTRAL. Expenditure is back-solved from the *physics* of
 *     logged intake vs. measured trend-weight change. We never reward or
 *     punish the user for how consistently they log. Missing intake days are
 *     simply excluded from the intake mean — never imputed as 0 (which would
 *     fabricate a deficit) and never imputed as the target (which would
 *     fabricate adherence).
 *
 *  2. NO "MAKE-UP" MATH. The daily target depends ONLY on the current TDEE
 *     estimate and the user's goal rate. It has no memory of yesterday's
 *     surplus/deficit, no weekly "calorie bank", no rollover. An over-target
 *     day NEVER lowers tomorrow's target. (See adherenceNeutralTarget +
 *     weeklyTargets.)
 *
 *  3. GRACEFUL DEGRADATION THROUGH GAPS. When logging is sparse, the engine
 *     widens its window, lowers its confidence, and — if there is a prior
 *     estimate — carries it forward (optionally blended) rather than emitting
 *     a noisy or punitive number.
 *
 *  4. PURE DETERMINISTIC MATH. No LLM, no network, no Date.now(), no I/O.
 *     Same inputs -> same outputs, always.
 */

export const ENERGY_DENSITY_KCAL_PER_KG = 7700;

export interface DailyRecord {
  /** ISO calendar date, "YYYY-MM-DD". */
  date: string;
  /** Raw scale weight in kg, or null if there was no weigh-in that day. */
  weightKg: number | null;
  /** Logged energy intake in kcal, or null if the user did not log. */
  caloriesIn: number | null;
}

export interface TrendPoint {
  date: string;
  /** Raw weigh-in for the day, or null where the value was interpolated. */
  rawWeightKg: number | null;
  /** Recency-weighted smoothed trend weight in kg. */
  trendWeightKg: number;
  /** True when the weight for this day was filled in, not measured. */
  interpolated: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayIndex(iso: string): number {
  return Math.round(new Date(iso + "T00:00:00Z").getTime() / MS_PER_DAY);
}

/**
 * Expand a set of daily records into a contiguous, ascending daily grid and
 * linearly interpolate any missing weigh-ins.
 *
 * - Interior gaps between two weigh-ins are filled by straight-line
 *   interpolation.
 * - Leading days before the first weigh-in carry the first known value
 *   backward; trailing days after the last weigh-in carry the last known value
 *   forward. (Carry-forward is the graceful, non-fabricating choice for the
 *   edges where we cannot interpolate.)
 */
export function interpolateDailyWeights(
  records: DailyRecord[]
): { date: string; weightKg: number; interpolated: boolean }[] {
  const known = records
    .filter((r) => r.weightKg !== null && Number.isFinite(r.weightKg))
    .map((r) => ({ idx: dayIndex(r.date), date: r.date, val: r.weightKg as number }))
    .sort((a, b) => a.idx - b.idx);

  if (known.length === 0) return [];

  const startIdx = known[0].idx;
  const endIdx = known[known.length - 1].idx;
  const out: { date: string; weightKg: number; interpolated: boolean }[] = [];

  let segment = 0; // index into `known` of the left endpoint of current segment
  for (let idx = startIdx; idx <= endIdx; idx++) {
    while (segment < known.length - 1 && known[segment + 1].idx <= idx) segment++;
    const left = known[segment];
    const right = known[Math.min(segment + 1, known.length - 1)];
    const iso = new Date(idx * MS_PER_DAY).toISOString().slice(0, 10);

    if (idx === left.idx) {
      out.push({ date: iso, weightKg: left.val, interpolated: false });
    } else if (right.idx > left.idx) {
      const frac = (idx - left.idx) / (right.idx - left.idx);
      const val = left.val + (right.val - left.val) * frac;
      out.push({ date: iso, weightKg: round2(val), interpolated: true });
    } else {
      out.push({ date: iso, weightKg: left.val, interpolated: true });
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recency-weighted trend-weight smoother.
 *
 * Interpolates missed weigh-ins (see interpolateDailyWeights) and then applies
 * an exponentially weighted moving average over the daily grid. Because the
 * grid is contiguous, a constant per-day smoothing factor yields exponentially
 * decaying weights toward the past — i.e. recent weigh-ins dominate the trend
 * while old ones fade. `halfLifeDays` is the number of days after which a
 * reading's influence halves.
 */
export function recencyWeightedTrend(
  records: DailyRecord[],
  halfLifeDays = 10
): TrendPoint[] {
  const daily = interpolateDailyWeights(records);
  if (daily.length === 0) return [];

  const alpha = 1 - Math.pow(0.5, 1 / Math.max(halfLifeDays, 1));
  let trend = daily[0].weightKg;
  const out: TrendPoint[] = [];

  for (const d of daily) {
    trend = alpha * d.weightKg + (1 - alpha) * trend;
    out.push({
      date: d.date,
      rawWeightKg: d.interpolated ? null : d.weightKg,
      trendWeightKg: round2(trend),
      interpolated: d.interpolated,
    });
  }
  return out;
}

/**
 * Recency-weighted least-squares slope of the trend weight, in kg/day, over
 * the last `windowDays` of trend points. More recent days are weighted more
 * heavily so the slope tracks the user's *current* trajectory.
 */
export function trendSlopeKgPerDay(
  trend: TrendPoint[],
  windowDays = 14,
  halfLifeDays = 10
): number | null {
  if (trend.length < 2) return null;
  const recent = trend.slice(-windowDays);
  if (recent.length < 2) return null;

  const decay = Math.pow(0.5, 1 / Math.max(halfLifeDays, 1));
  const n = recent.length;
  let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;

  for (let i = 0; i < n; i++) {
    const x = i; // day offset within window
    const y = recent[i].trendWeightKg;
    const w = Math.pow(decay, n - 1 - i); // newest day -> weight 1
    sw += w; swx += w * x; swy += w * y; swxx += w * x * x; swxy += w * x * y;
  }

  const denom = sw * swxx - swx * swx;
  if (denom === 0) return null;
  return (sw * swxy - swx * swy) / denom;
}

export interface BackSolveResult {
  /** Back-solved total daily energy expenditure, kcal/day. */
  tdee: number;
  /** Recency-weighted mean of *logged* intake over the window, kcal/day. */
  meanIntake: number;
  /** Trend-weight slope used, kg/day (negative = losing). */
  slopeKgPerDay: number;
  /** Number of days in the window that actually had a logged intake. */
  loggedDays: number;
  /** Fraction of window days with logged intake, 0..1. */
  coverage: number;
}

/**
 * Back-solve expenditure from energy balance:
 *
 *   TDEE = meanIntake - (slopeKgPerDay * ENERGY_DENSITY)
 *
 * meanIntake is a recency-weighted mean over the days in the window that the
 * user actually logged. Unlogged days contribute nothing to the intake mean
 * (their effect is still captured in the measured weight trend) — this is what
 * keeps the estimate adherence-neutral.
 */
export function backSolveExpenditure(
  records: DailyRecord[],
  windowDays = 14,
  halfLifeDays = 10
): BackSolveResult | null {
  const trend = recencyWeightedTrend(records, halfLifeDays);
  const slope = trendSlopeKgPerDay(trend, windowDays, halfLifeDays);
  if (slope === null) return null;

  const sorted = [...records].sort((a, b) => dayIndex(a.date) - dayIndex(b.date));
  const window = sorted.slice(-windowDays);
  const logged = window.filter(
    (r) => r.caloriesIn !== null && Number.isFinite(r.caloriesIn)
  );
  if (logged.length === 0) return null;

  const decay = Math.pow(0.5, 1 / Math.max(halfLifeDays, 1));
  const maxIdx = dayIndex(logged[logged.length - 1].date);
  let sw = 0, swCal = 0;
  for (const r of logged) {
    const age = maxIdx - dayIndex(r.date);
    const w = Math.pow(decay, age);
    sw += w;
    swCal += w * (r.caloriesIn as number);
  }
  const meanIntake = swCal / sw;
  const tdee = meanIntake - slope * ENERGY_DENSITY_KCAL_PER_KG;

  return {
    tdee: Math.round(tdee),
    meanIntake: Math.round(meanIntake),
    slopeKgPerDay: slope,
    loggedDays: logged.length,
    coverage: window.length > 0 ? logged.length / window.length : 0,
  };
}

export type TDEEMethod =
  | "mifflin"
  | "blended"
  | "adaptive"
  | "carry_forward";

export type TDEEConfidence = "stale" | "low" | "medium" | "high";

export interface AdaptiveEstimate {
  estimatedTDEE: number;
  method: TDEEMethod;
  confidence: TDEEConfidence;
  /** meanIntake - TDEE: + surplus / - deficit, kcal/day. 0 when unknown. */
  energyDelta: number;
  /** Trend slope kg/day, or null when unavailable. */
  slopeKgPerDay: number | null;
  /** Logged-intake coverage of the window, 0..1. */
  coverage: number;
}

export interface EstimateOptions {
  windowDays?: number;
  halfLifeDays?: number;
  /** Previous TDEE estimate, used for carry-forward when data is thin. */
  previousTDEE?: number | null;
  /** Mifflin-St Jeor fallback for the cold-start bootstrap window. */
  mifflinEstimate?: number | null;
  /** Days of data below which we blend with the Mifflin estimate. */
  bootstrapDays?: number;
}

/**
 * Top-level adherence-neutral TDEE estimate with graceful degradation.
 *
 * Resolution order:
 *  - Enough signal -> adaptive back-solve (blended with Mifflin during the
 *    bootstrap window).
 *  - Thin/zero signal but a prior estimate exists -> carry it forward.
 *  - Otherwise -> Mifflin fallback, else null.
 */
export function estimateAdaptiveTDEE(
  records: DailyRecord[],
  opts: EstimateOptions = {}
): AdaptiveEstimate | null {
  const windowDays = opts.windowDays ?? 14;
  const halfLifeDays = opts.halfLifeDays ?? 10;
  const bootstrapDays = opts.bootstrapDays ?? 14;
  const prev = opts.previousTDEE ?? null;
  const mifflin = opts.mifflinEstimate ?? null;

  const daysOfData = countSpanDays(records);
  const solved = backSolveExpenditure(records, windowDays, halfLifeDays);

  // Not enough to back-solve: degrade gracefully.
  if (!solved) {
    if (prev !== null) {
      return {
        estimatedTDEE: Math.round(prev),
        method: "carry_forward",
        confidence: "stale",
        energyDelta: 0,
        slopeKgPerDay: null,
        coverage: 0,
      };
    }
    if (mifflin !== null) {
      return {
        estimatedTDEE: Math.round(mifflin),
        method: "mifflin",
        confidence: "low",
        energyDelta: 0,
        slopeKgPerDay: null,
        coverage: 0,
      };
    }
    return null;
  }

  let estimate = solved.tdee;
  let method: TDEEMethod = "adaptive";

  // Cold-start bootstrap: blend toward Mifflin while data is young.
  if (daysOfData < bootstrapDays && mifflin !== null) {
    const w = clamp01(daysOfData / bootstrapDays); // 0 -> all Mifflin, 1 -> all adaptive
    estimate = Math.round(mifflin * (1 - w) + solved.tdee * w);
    method = "blended";
  }

  // Low-coverage smoothing: lean on the prior estimate to avoid jumpy,
  // potentially punitive numbers when logging is sparse.
  if (solved.coverage < 0.4 && prev !== null) {
    const w = clamp01(solved.coverage / 0.4);
    estimate = Math.round(prev * (1 - w) + estimate * w);
  }

  const confidence = deriveConfidence(daysOfData, solved.coverage);

  return {
    estimatedTDEE: estimate,
    method,
    confidence,
    energyDelta: Math.round(solved.meanIntake - estimate),
    slopeKgPerDay: solved.slopeKgPerDay,
    coverage: round2(solved.coverage),
  };
}

function deriveConfidence(daysOfData: number, coverage: number): TDEEConfidence {
  if (daysOfData < 7 || coverage < 0.3) return "low";
  if (daysOfData >= 21 && coverage >= 0.6) return "high";
  return "medium";
}

function countSpanDays(records: DailyRecord[]): number {
  const idxs = records.map((r) => dayIndex(r.date));
  if (idxs.length === 0) return 0;
  return Math.max(...idxs) - Math.min(...idxs) + 1;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export interface TargetInput {
  /** Current adaptive TDEE estimate, kcal/day. */
  tdee: number;
  /**
   * Goal weight-change rate in kg/week. Negative = lose, positive = gain,
   * 0 = maintain. This is the ONLY lever besides TDEE.
   */
  goalRateKgPerWeek?: number;
  /** Safety floor; targets are never recommended below this. */
  floorKcal?: number;
}

export interface DailyTarget {
  /** The calorie target for the day, kcal. */
  dailyTarget: number;
  /** Intended daily energy delta vs. TDEE, kcal (negative = deficit). */
  dailyEnergyDelta: number;
}

/**
 * Adherence-neutral daily calorie target.
 *
 * The target is a pure function of the current TDEE estimate and the goal
 * rate. It deliberately takes NO history of prior intake, adherence, surpluses
 * or deficits as input — so an over-target day can never raise or lower a
 * later day's target. There is no "calorie bank" and no "make-up" term, by
 * construction.
 */
export function adherenceNeutralTarget(input: TargetInput): DailyTarget {
  const goalRate = input.goalRateKgPerWeek ?? 0;
  const floor = input.floorKcal ?? 1200;
  const dailyEnergyDelta = Math.round(
    (goalRate * ENERGY_DENSITY_KCAL_PER_KG) / 7
  );
  const dailyTarget = Math.max(floor, Math.round(input.tdee + dailyEnergyDelta));
  return { dailyTarget, dailyEnergyDelta };
}

/**
 * Targets for an arbitrary run of days. Every day receives the SAME target for
 * a given TDEE + goal rate — an executable statement of the no-rollover,
 * no-make-up policy. Past intake is intentionally not a parameter.
 */
export function weeklyTargets(input: TargetInput, days = 7): DailyTarget[] {
  const t = adherenceNeutralTarget(input);
  return Array.from({ length: days }, () => ({ ...t }));
}
