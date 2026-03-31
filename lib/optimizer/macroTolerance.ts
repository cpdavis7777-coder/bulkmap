import type { PlanOutput } from "@/lib/types/bulkmap";

/** Default acceptable band for daily macro averages vs targets (±10%). */
export const MACRO_TOLERANCE = 0.1;

export type MacroDailyRatios = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DailyTargets = {
  daily_calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export function getMacroDailyRatiosFromTotals(
  totals: { calories: number; protein: number; carbs: number; fat: number },
  days: number,
  t: DailyTargets,
): MacroDailyRatios {
  const d = Math.max(1, days);
  return {
    calories: totals.calories / d / Math.max(1, t.daily_calories),
    protein: totals.protein / d / Math.max(1, t.protein_g),
    carbs: totals.carbs / d / Math.max(1, t.carb_g),
    fat: totals.fat / d / Math.max(1, t.fat_g),
  };
}

export function getMacroDailyRatios(plan: PlanOutput): MacroDailyRatios {
  return getMacroDailyRatiosFromTotals(
    {
      calories: plan.calories,
      protein: plan.protein,
      carbs: plan.carbs,
      fat: plan.fat,
    },
    plan.targets.duration_days,
    plan.targets,
  );
}

export function validateMacroToleranceFromRatios(
  r: MacroDailyRatios,
  options: { carbRelaxed: boolean; tolerance?: number },
): { ok: true } | { ok: false; message: string } {
  const tol = options.tolerance ?? MACRO_TOLERANCE;
  const low = 1 - tol;
  const high = 1 + tol;
  const issues: string[] = [];

  const check = (name: string, ratio: number, relaxed = false) => {
    const lo = relaxed ? Math.max(0.8, low - 0.05) : low;
    const hi = relaxed ? high + 0.05 : high;
    if (ratio < lo || ratio > hi) {
      issues.push(
        `${name} is ${(ratio * 100).toFixed(1)}% of target (want ~${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%)`,
      );
    }
  };

  check("Calories", r.calories);
  check("Protein", r.protein);
  check("Fat", r.fat);
  check("Carbs", r.carbs, options.carbRelaxed);

  if (issues.length === 0) return { ok: true };
  return {
    ok: false,
    message: `Plan could not hit macro targets within ±${(tol * 100).toFixed(0)}%: ${issues.join("; ")}. Try raising budget, shortening the plan, or relaxing exclusions.`,
  };
}

export function validateMacroTolerance(
  plan: PlanOutput,
  options: { carbRelaxed: boolean; tolerance?: number },
): { ok: true } | { ok: false; message: string } {
  const r = getMacroDailyRatios(plan);
  return validateMacroToleranceFromRatios(r, options);
}
