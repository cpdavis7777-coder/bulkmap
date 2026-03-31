import type { FoodItem } from "@/lib/data/foods";
import { maxGramsForFoodWindow, type MaxGramCapOptions } from "@/lib/optimizer/foodConstraints";
import type { PlanInput } from "@/lib/types/bulkmap";

/** Rough upper bound on period protein (g) achievable from catalog with given caps. */
export function estimateMaxPeriodProtein(
  availableFoods: FoodItem[],
  days: number,
  capOpts: MaxGramCapOptions,
): number {
  let total = 0;
  for (const f of availableFoods) {
    if (f.role !== "protein" && f.role !== "legume") continue;
    const g = maxGramsForFoodWindow(f, days, capOpts);
    total += (f.protein * g) / 100;
  }
  return total;
}

/** Rough lower-bound cost ($) to buy `grams` of a food at its list price. */
function costForGrams(food: FoodItem, grams: number): number {
  return (food.price_per_100g * grams) / 100;
}

/**
 * Minimum spend to hit protein target using only the densest available protein (optimistic lower bound).
 * If this exceeds budget, protein is likely budget-blocked.
 */
export function estimateMinSpendForProteinTarget(
  proteinFoods: FoodItem[],
  periodProtein: number,
  capOpts: MaxGramCapOptions,
  days: number,
): number {
  if (proteinFoods.length === 0 || periodProtein <= 0) return 0;
  const sorted = [...proteinFoods].sort(
    (a, b) => b.protein / Math.max(0.01, b.price_per_100g) - a.protein / Math.max(0.01, a.price_per_100g),
  );
  let remaining = periodProtein;
  let cost = 0;
  for (const food of sorted) {
    if (remaining <= 0) break;
    const maxG = maxGramsForFoodWindow(food, days, capOpts);
    const pPerG = food.protein / 100;
    const maxP = pPerG * maxG;
    const takeP = Math.min(remaining, maxP);
    const takeG = takeP / Math.max(0.001, pPerG);
    cost += costForGrams(food, takeG);
    remaining -= takeP;
  }
  return cost;
}

export type MacroDiagnosis = {
  code:
    | "protein_catalog_cap"
    | "protein_budget"
    | "macro_balance"
    | "unknown";
  detail: string;
};

export function diagnoseInfeasibility(args: {
  input: PlanInput;
  availableFoods: FoodItem[];
  days: number;
  periodProtein: number;
  budgetPeriod: number;
  capOpts: MaxGramCapOptions;
  totals: { cost: number; protein: number; calories: number; carbs: number; fat: number };
}): MacroDiagnosis {
  const { availableFoods, days, periodProtein, budgetPeriod, capOpts, totals } = args;
  const maxP = estimateMaxPeriodProtein(availableFoods, days, capOpts);
  const proteinFoods = availableFoods.filter((f) => f.role === "protein");

  if (maxP < periodProtein * 0.92) {
    return {
      code: "protein_catalog_cap",
      detail: `The food catalog and per-item weekly limits allow at most about ${Math.round(maxP)}g protein for this shopping window, but the target needs ${Math.round(periodProtein)}g. Raise per-food variety limits (already attempted in feasibility mode), add more protein sources to the catalog, or lower the protein target.`,
    };
  }

  const minSpend = estimateMinSpendForProteinTarget(proteinFoods, periodProtein * 0.95, capOpts, days);
  if (minSpend > budgetPeriod * 1.02 && totals.protein < periodProtein * 0.92) {
    return {
      code: "protein_budget",
      detail: `Hitting ~${Math.round(periodProtein)}g protein for this window likely requires roughly $${Math.ceil(minSpend)} in protein-rich foods, above the ~$${budgetPeriod.toFixed(0)} budget cap. Increase weekly budget or relax protein/calorie targets.`,
    };
  }

  return {
    code: "macro_balance",
    detail:
      "The greedy planner could not balance calories, protein, carbs, and fat within tolerance. This can happen when fat and carb sources add calories faster than macros align—try feasibility mode (automatic on failure) or adjust targets slightly.",
  };
}
