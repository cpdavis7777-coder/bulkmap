import { getFoodFlags } from "@/lib/data/foodFlags";
import { getMacroDailyRatios } from "@/lib/optimizer/macroTolerance";
import type { PlanInput, PlanOutput, PlanScores, PlanVariantResult } from "@/lib/types/bulkmap";

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const MACRO_KEYS = new Set(["calories", "protein", "carbs", "fat"]);

/** True when daily macro averages are within ±10% of targets (optimizer contract). */
export function macroBandOk(plan: PlanOutput): boolean {
  const r = getMacroDailyRatios(plan);
  const lo = 0.9;
  const hi = 1.1;
  return [r.calories, r.protein, r.carbs, r.fat].every((x) => x >= lo && x <= hi);
}

/** Primary score: equal weight on all four macros; overshoot (esp. kcal/carbs/fat) penalized more than mild undershoot. */
function macroPenalty(plan: PlanOutput): number {
  const t = plan.targets;
  const d = Math.max(1, plan.targets.duration_days);
  const ratios = [
    plan.calories / d / Math.max(1, t.daily_calories),
    plan.protein / d / Math.max(1, t.protein_g),
    plan.carbs / d / Math.max(1, t.carb_g),
    plan.fat / d / Math.max(1, t.fat_g),
  ];
  const weights = [2.4, 1.15, 2.0, 2.0];
  const errs = ratios.map((r, i) => {
    if (r > 1) {
      const over = r - 1;
      return over * weights[i] * 2.1;
    }
    return (1 - r) * weights[i];
  });
  return mean(errs);
}

/** Beneficial micros: reward hitting ~90%+; no score penalty for moderate overages up to ~150%. */
function beneficialMicroScore(plan: PlanOutput): number {
  const rows = plan.nutrient_coverage.filter((n) => !MACRO_KEYS.has(n.key) && !n.is_cap);
  if (rows.length === 0) return 0.45;

  const piece = (pct: number) => {
    const p = pct / 100;
    if (p < 0.45) return p * 0.35;
    if (p < 0.75) return 0.55 + p * 0.25;
    if (p < 0.9) return 0.75 + p * 0.15;
    if (p <= 1.5) return 1;
    return Math.max(0.88, 1.02 - (p - 1.5) * 0.08);
  };

  return Math.max(0, Math.min(1, mean(rows.map((n) => piece(n.pct_of_daily_target)))));
}

/** Limit nutrients: strong penalty past 100% of cap DV. */
function limitComplianceScore(plan: PlanOutput): number {
  const caps = plan.nutrient_coverage.filter((n) => n.is_cap);
  if (caps.length === 0) return 1;

  const piece = (pct: number) => {
    const p = pct / 100;
    if (p <= 1) return 1;
    if (p <= 1.12) return 1 - (p - 1) * 4;
    if (p <= 1.35) return Math.max(0, 0.55 - (p - 1.12) * 2);
    return 0.1;
  };

  return Math.max(0, Math.min(1, mean(caps.map((n) => piece(n.pct_of_daily_target)))));
}

function budgetCompliance(plan: PlanOutput, input: PlanInput): number {
  const days = plan.targets.duration_days;
  const budgetPeriod = input.budget_per_week * (days / 7);
  if (plan.total_cost <= budgetPeriod) {
    const headroom = 1 - plan.total_cost / Math.max(1, budgetPeriod);
    return Math.min(1, 0.88 + headroom * 0.12);
  }
  const over = (plan.total_cost - budgetPeriod) / Math.max(1, budgetPeriod);
  return Math.max(0, 1 - over * 3);
}

export function computePlanQualityScore(plan: PlanOutput): number {
  const n = plan.foods.length;
  if (n === 0) return 0;
  const countScore = Math.max(0, 1 - Math.max(0, n - 10) * 0.055);
  const flags = plan.foods.map((f) => getFoodFlags(f.name));
  const whole = mean(flags.map((f) => f.whole_food_score / 5));
  const qual = mean(flags.map((f) => f.quality_score / 5));
  const up = mean(flags.map((f) => 1 - f.ultra_processed_risk / 5));
  const microRows = plan.nutrient_coverage.filter(
    (r) => !["calories", "protein", "carbs", "fat"].includes(r.key) && !r.is_cap,
  );
  const density =
    microRows.length === 0 ? 0.5 : mean(microRows.map((r) => Math.min(1.2, r.pct_of_daily_target / 100))) / 1.2;
  return Math.max(0, Math.min(1, 0.22 * countScore + 0.26 * whole + 0.2 * qual + 0.14 * up + 0.18 * density));
}

export function scorePlan(plan: PlanOutput, input: PlanInput): PlanScores {
  const macro_fit = Math.max(0, Math.min(1, 1 - macroPenalty(plan)));
  const beneficial_micro_fit = beneficialMicroScore(plan);
  const limit_compliance = limitComplianceScore(plan);
  const micro_fit = Math.max(0, Math.min(1, 0.62 * beneficial_micro_fit + 0.38 * limit_compliance));
  const cost_efficiency = budgetCompliance(plan, input);

  const n = plan.foods.length;
  const variety_score = Math.max(0, Math.min(1, n / 12));

  let preference_alignment = 0.5;
  if (input.soft_preferences?.organic_preferred) {
    const org = plan.foods.filter((f) => getFoodFlags(f.name).organic_eligible).length;
    preference_alignment = org / Math.max(1, plan.foods.length);
  } else {
    preference_alignment = 0.72;
  }

  const quality_score = computePlanQualityScore(plan);
  const bandOk = macroBandOk(plan);

  const macroWeighted = 0.58 * macro_fit + 0.18 * beneficial_micro_fit + 0.12 * limit_compliance + 0.07 * quality_score + 0.05 * cost_efficiency;

  const overall_fit = bandOk
    ? Math.max(0, Math.min(1, macroWeighted))
    : Math.max(0, Math.min(0.52, macroWeighted * 0.72));

  return {
    macro_fit: Number(macro_fit.toFixed(3)),
    micro_fit: Number(micro_fit.toFixed(3)),
    beneficial_micro_fit: Number(beneficial_micro_fit.toFixed(3)),
    limit_compliance: Number(limit_compliance.toFixed(3)),
    cost_efficiency: Number(cost_efficiency.toFixed(3)),
    variety_score: Number(variety_score.toFixed(3)),
    preference_alignment: Number(preference_alignment.toFixed(3)),
    quality_score: Number(quality_score.toFixed(3)),
    overall_fit: Number(overall_fit.toFixed(3)),
  };
}

export function assignCrossVariantBadges(variants: PlanVariantResult[]): void {
  if (variants.length === 0) return;

  const lowest = [...variants].sort((a, b) => a.total_cost - b.total_cost)[0];
  if (lowest) {
    lowest.badges.push("Lowest Cost");
  }

  const bestVar = [...variants].sort((a, b) => b.scores.variety_score - a.scores.variety_score)[0];
  if (bestVar) {
    bestVar.badges.push("Best Variety");
  }

  const bestMacro = [...variants].sort((a, b) => b.scores.macro_fit - a.scores.macro_fit)[0];
  if (bestMacro) {
    bestMacro.badges.push("Best Macro Fit");
  }

  const bestMicro = [...variants].sort((a, b) => b.scores.beneficial_micro_fit - a.scores.beneficial_micro_fit)[0];
  if (bestMicro) {
    bestMicro.badges.push("Best Micronutrient Fit");
  }

  const bestLimits = [...variants].sort((a, b) => b.scores.limit_compliance - a.scores.limit_compliance)[0];
  if (bestLimits) {
    bestLimits.badges.push("Best Limit Compliance");
  }

  const bestQuality = [...variants].sort((a, b) => b.scores.quality_score - a.scores.quality_score)[0];
  if (bestQuality) {
    bestQuality.badges.push("Highest Quality");
  }

  const whole = [...variants].sort((a, b) => {
    const wa = mean(planWholeFoodScore(a));
    const wb = mean(planWholeFoodScore(b));
    return wb - wa;
  })[0];
  if (whole) {
    whole.badges.push("Whole-Food Heavy");
  }

  for (const v of variants) {
    v.badges = [...new Set(v.badges)];
  }
}

function planWholeFoodScore(plan: PlanOutput): number[] {
  return plan.foods.map((f) => getFoodFlags(f.name).whole_food_score);
}

export function pickRecommendedVariant(input: PlanInput): "budget" | "quality" | "variety" {
  const s = input.soft_preferences;
  if (s?.quality_first) return "quality";
  if (s?.variety_first) return "variety";
  if (s?.budget_first) return "budget";
  return "budget";
}
