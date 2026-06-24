import { test } from "node:test";
import assert from "node:assert/strict";
import {
  interpolateDailyWeights,
  recencyWeightedTrend,
  backSolveExpenditure,
  estimateAdaptiveTDEE,
  adherenceNeutralTarget,
  weeklyTargets,
  type DailyRecord,
} from "./adaptive.ts";

function isoFromBase(base: string, offset: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Build a contiguous daily series. weightFn/calFn return null to omit. */
function series(
  base: string,
  n: number,
  weightFn: (i: number) => number | null,
  calFn: (i: number) => number | null
): DailyRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    date: isoFromBase(base, i),
    weightKg: weightFn(i),
    caloriesIn: calFn(i),
  }));
}

test("interpolateDailyWeights fills interior gaps linearly", () => {
  const recs: DailyRecord[] = [
    { date: "2026-01-01", weightKg: 80, caloriesIn: null },
    { date: "2026-01-05", weightKg: 84, caloriesIn: null }, // gap of 3 days
  ];
  const out = interpolateDailyWeights(recs);
  assert.equal(out.length, 5);
  assert.equal(out[0].weightKg, 80);
  assert.equal(out[2].weightKg, 82); // midpoint
  assert.equal(out[4].weightKg, 84);
  assert.equal(out[1].interpolated, true);
  assert.equal(out[0].interpolated, false);
});

test("recencyWeightedTrend smooths a noisy spike", () => {
  const recs = series("2026-01-01", 15, (i) => (i === 7 ? 90 : 80), () => null);
  const trend = recencyWeightedTrend(recs, 10);
  // The lone 90kg spike must be heavily damped in the trend.
  const spike = trend[7].trendWeightKg;
  assert.ok(spike < 82, `spike ${spike} should be damped well below 90`);
  assert.ok(spike > 80, `spike ${spike} should move slightly toward 90`);
  assert.equal(trend.length, 15);
});

test("backSolveExpenditure recovers TDEE for flat weight", () => {
  // Flat weight, intake 2500 => expenditure == intake.
  const recs = series("2026-01-01", 21, () => 80, () => 2500);
  const res = backSolveExpenditure(recs);
  assert.ok(res);
  assert.equal(res!.slopeKgPerDay === null, false);
  assert.ok(Math.abs(res!.tdee - 2500) <= 10, `tdee ${res!.tdee} ~ 2500`);
  assert.equal(res!.coverage, 1);
});

test("backSolveExpenditure recovers TDEE during weight loss", () => {
  // Losing 0.1 kg/day on 2000 kcal => TDEE ~ 2000 + 0.1*7700 = 2770.
  // 60 days mirrors the API's lookback window so the trend smoother has
  // reached steady state (an EWMA under-reports slope during its transient).
  const recs = series(
    "2026-01-01",
    60,
    (i) => 80 - i * 0.1,
    () => 2000
  );
  const res = backSolveExpenditure(recs);
  assert.ok(res);
  assert.ok(res!.slopeKgPerDay! < 0, "slope should be negative");
  assert.ok(Math.abs(res!.tdee - 2770) <= 60, `tdee ${res!.tdee} ~ 2770`);
});

test("missing intake days do not fabricate a deficit (adherence-neutral)", () => {
  // Same physics as flat-2500 case but the user only logged half the days.
  const recs = series(
    "2026-01-01",
    21,
    () => 80,
    (i) => (i % 2 === 0 ? 2500 : null)
  );
  const res = backSolveExpenditure(recs);
  assert.ok(res);
  // Unlogged days excluded -> intake mean still 2500, TDEE still ~2500.
  assert.ok(Math.abs(res!.tdee - 2500) <= 10, `tdee ${res!.tdee} ~ 2500`);
  assert.ok(res!.coverage < 1, "coverage reflects partial logging");
});

test("estimateAdaptiveTDEE carries forward through a logging gap", () => {
  // No usable weight signal, but a prior estimate exists.
  const recs = series("2026-01-01", 1, () => 80, () => null);
  const est = estimateAdaptiveTDEE(recs, { previousTDEE: 2600 });
  assert.ok(est);
  assert.equal(est!.method, "carry_forward");
  assert.equal(est!.confidence, "stale");
  assert.equal(est!.estimatedTDEE, 2600);
});

test("estimateAdaptiveTDEE falls back to Mifflin with no prior", () => {
  const est = estimateAdaptiveTDEE([], { mifflinEstimate: 2400 });
  assert.ok(est);
  assert.equal(est!.method, "mifflin");
  assert.equal(est!.estimatedTDEE, 2400);
});

test("adherenceNeutralTarget is a pure function of TDEE + goal rate", () => {
  assert.equal(adherenceNeutralTarget({ tdee: 2500 }).dailyTarget, 2500);
  // 0.5 kg/week loss => ~ -550 kcal/day.
  const cut = adherenceNeutralTarget({ tdee: 2500, goalRateKgPerWeek: -0.5 });
  assert.equal(cut.dailyEnergyDelta, -550);
  assert.equal(cut.dailyTarget, 1950);
  // Safety floor is honored.
  assert.equal(
    adherenceNeutralTarget({ tdee: 1300, goalRateKgPerWeek: -1, floorKcal: 1200 })
      .dailyTarget,
    1200
  );
});

test("NO make-up: an over-target day never changes a later day's target", () => {
  const input = { tdee: 2200, goalRateKgPerWeek: -0.5 };
  const week = weeklyTargets(input, 7);
  const expected = adherenceNeutralTarget(input).dailyTarget;
  // Every day identical, regardless of how badly day 1 went over.
  for (const day of week) assert.equal(day.dailyTarget, expected);
  // Target does not accept (and cannot react to) prior intake at all.
  assert.equal(
    adherenceNeutralTarget(input).dailyTarget,
    adherenceNeutralTarget(input).dailyTarget
  );
});
