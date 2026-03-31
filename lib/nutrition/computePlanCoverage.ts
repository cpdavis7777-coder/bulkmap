import type { NutrientCoverageRow, NutrientsPer100g, NutrientCoverageStatus } from "@/lib/types/nutrition";

const MACRO_KEYS = new Set(["calories", "protein", "carbs", "fat"]);

const LABELS: Record<string, { label: string; unit: string; cap?: boolean }> = {
  fiber_g: { label: "Fiber", unit: "g" },
  sugar_g: { label: "Sugar", unit: "g", cap: true },
  sodium_mg: { label: "Sodium", unit: "mg", cap: true },
  sat_fat_g: { label: "Saturated fat", unit: "g", cap: true },
  vit_a_mcg_rae: { label: "Vitamin A", unit: "mcg RAE" },
  vit_c_mg: { label: "Vitamin C", unit: "mg" },
  vit_d_mcg: { label: "Vitamin D", unit: "mcg" },
  vit_e_mg: { label: "Vitamin E", unit: "mg" },
  vit_k_mcg: { label: "Vitamin K", unit: "mcg" },
  vit_b1_mg: { label: "Vitamin B1 (thiamine)", unit: "mg" },
  vit_b2_mg: { label: "Vitamin B2 (riboflavin)", unit: "mg" },
  vit_b3_mg: { label: "Vitamin B3 (niacin)", unit: "mg" },
  vit_b5_mg: { label: "Vitamin B5 (pantothenic acid)", unit: "mg" },
  vit_b6_mg: { label: "Vitamin B6", unit: "mg" },
  vit_b12_mcg: { label: "Vitamin B12", unit: "mcg" },
  folate_mcg_dfe: { label: "Folate (DFE)", unit: "mcg" },
  calcium_mg: { label: "Calcium", unit: "mg" },
  iron_mg: { label: "Iron", unit: "mg" },
  magnesium_mg: { label: "Magnesium", unit: "mg" },
  potassium_mg: { label: "Potassium", unit: "mg" },
  zinc_mg: { label: "Zinc", unit: "mg" },
  phosphorus_mg: { label: "Phosphorus", unit: "mg" },
  selenium_mcg: { label: "Selenium", unit: "mcg" },
  manganese_mg: { label: "Manganese", unit: "mg" },
  copper_mg: { label: "Copper", unit: "mg" },
};

/** Beneficial micros / fiber / vitamins: minimum ~90%, modest overage is fine. */
function statusForBeneficial(pct: number): NutrientCoverageStatus {
  if (pct < 90) return "under";
  if (pct <= 110) return "ok";
  return "above";
}

/** Limit nutrients (sugar, sat fat, sodium): at or under DV is on target; above is over limit. */
function statusForLimitNutrient(pct: number): NutrientCoverageStatus {
  if (pct <= 100) return "ok";
  return "over";
}

/** Macros vs plan targets (±10% band). */
function statusForMacro(pct: number): NutrientCoverageStatus {
  if (pct < 90) return "under";
  if (pct <= 110) return "ok";
  return "above";
}

function finiteOr(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/** Drop or fix invalid rows so UI never receives undefined numerics. */
export function sanitizeNutrientCoverageRows(rows: NutrientCoverageRow[]): NutrientCoverageRow[] {
  return rows
    .filter((r) => r && typeof r.key === "string")
    .map((r) => {
      const target_daily = finiteOr(r.target_daily, 0);
      if (target_daily <= 0) return null;
      const actual_period = finiteOr(r.actual_period, 0);
      const actual_daily_avg = finiteOr(r.actual_daily_avg, 0);
      let pct = finiteOr(r.pct_of_daily_target, (actual_daily_avg / target_daily) * 100);
      if (!Number.isFinite(pct)) pct = 0;
      const is_cap = r.is_cap;
      let status: NutrientCoverageStatus;
      if (MACRO_KEYS.has(r.key)) {
        status = statusForMacro(pct);
      } else if (is_cap) {
        status = statusForLimitNutrient(pct);
      } else {
        status = statusForBeneficial(pct);
      }
      return {
        ...r,
        target_daily,
        actual_period,
        actual_daily_avg,
        pct_of_daily_target: Number(pct.toFixed(1)),
        status,
      };
    })
    .filter((r): r is NutrientCoverageRow => r !== null);
}

export function buildNutrientCoverageRows(params: {
  days: number;
  microPeriod: NutrientsPer100g;
  referenceDaily: Record<string, number>;
}): NutrientCoverageRow[] {
  const { days, microPeriod, referenceDaily } = params;
  const d = Math.max(1, days);
  const rows: NutrientCoverageRow[] = [];

  for (const key of Object.keys(LABELS)) {
    const meta = LABELS[key];
    const targetDaily = referenceDaily[key];
    if (targetDaily === undefined || targetDaily <= 0) continue;
    const periodVal = (microPeriod as Record<string, number>)[key] ?? 0;
    const dailyAvg = periodVal / d;
    const pct = (dailyAvg / targetDaily) * 100;
    const st = meta.cap ? statusForLimitNutrient(pct) : statusForBeneficial(pct);
    rows.push({
      key,
      label: meta.label,
      unit: meta.unit,
      target_daily: targetDaily,
      actual_period: Number(periodVal.toFixed(2)),
      actual_daily_avg: Number(dailyAvg.toFixed(2)),
      pct_of_daily_target: Number(pct.toFixed(1)),
      status: st,
      is_cap: meta.cap,
    });
  }

  return rows;
}

export function buildMacroCoverageRows(params: {
  days: number;
  period: { calories: number; protein: number; carbs: number; fat: number };
  dailyTargets: { calories: number; protein_g: number; carb_g: number; fat_g: number };
}): NutrientCoverageRow[] {
  const { days, period, dailyTargets } = params;
  const d = Math.max(1, days);
  const defs = [
    {
      key: "calories",
      label: "Calories",
      unit: "kcal" as const,
      target: finiteOr(dailyTargets.calories, 1),
      period: period.calories,
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g" as const,
      target: finiteOr(dailyTargets.protein_g, 1),
      period: period.protein,
    },
    {
      key: "carbs",
      label: "Carbs",
      unit: "g" as const,
      target: finiteOr(dailyTargets.carb_g, 1),
      period: period.carbs,
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g" as const,
      target: finiteOr(dailyTargets.fat_g, 1),
      period: period.fat,
    },
  ];
  return defs.map((x) => {
    const dailyAvg = x.period / d;
    const pct = (dailyAvg / Math.max(1e-6, x.target)) * 100;
    const safePct = Number.isFinite(pct) ? pct : 0;
    return {
      key: x.key,
      label: x.label,
      unit: x.unit,
      target_daily: x.target,
      actual_period: Number(finiteOr(x.period, 0).toFixed(1)),
      actual_daily_avg: Number(dailyAvg.toFixed(1)),
      pct_of_daily_target: Number(safePct.toFixed(1)),
      status: statusForMacro(safePct),
    };
  });
}

export function mergeMacroAndMicroRows(
  macroRows: NutrientCoverageRow[],
  microRows: NutrientCoverageRow[],
): NutrientCoverageRow[] {
  return [...macroRows, ...microRows];
}
