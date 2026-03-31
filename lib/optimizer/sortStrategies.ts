import { getFoodFlags } from "@/lib/data/foodFlags";
import type { FoodItem } from "@/lib/data/foods";
import type { SoftPreferences } from "@/lib/types/bulkmap";

export type PlanStrategy = "budget" | "quality" | "variety";

function macroValuePerDollar(f: FoodItem): number {
  const macroCals = f.protein * 4 + f.carbs * 4 + f.fat * 9;
  return macroCals / Math.max(0.02, f.price_per_100g);
}

/** Prefer lean, protein-dense foods for manual / high-protein macro fitting (not cost-ranked). */
export function sortProteinPoolForMacroFit(items: FoodItem[]): FoodItem[] {
  const copy = [...items];
  return copy.sort((a, b) => {
    const byDensity = b.protein - a.protein;
    if (Math.abs(byDensity) > 0.05) return byDensity;
    const effA = a.protein / Math.max(0.01, a.fat + 3);
    const effB = b.protein / Math.max(0.01, b.fat + 3);
    return effB - effA;
  });
}

export function sortProteinPool(
  items: FoodItem[],
  strategy: PlanStrategy,
  soft?: SoftPreferences,
): FoodItem[] {
  const copy = [...items];
  if (strategy === "budget") {
    return copy.sort((a, b) => macroValuePerDollar(b) * b.protein - macroValuePerDollar(a) * a.protein);
  }
  if (strategy === "quality") {
    return copy.sort((a, b) => {
      const fa = getFoodFlags(a.name);
      const fb = getFoodFlags(b.name);
      const oa = soft?.organic_preferred && fa.organic_eligible ? 1.2 : 1;
      const ob = soft?.organic_preferred && fb.organic_eligible ? 1.2 : 1;
      const pa = (6 - fa.ultra_processed_risk) / 5;
      const pb = (6 - fb.ultra_processed_risk) / 5;
      const sa = ((fa.quality_score * 2 + fa.whole_food_score * 2 + pa * 3) * oa) / a.price_per_100g;
      const sb = ((fb.quality_score * 2 + fb.whole_food_score * 2 + pb * 3) * ob) / b.price_per_100g;
      return sb - sa;
    });
  }
  const sorted = copy.sort((a, b) => b.protein / b.price_per_100g - a.protein / a.price_per_100g);
  const offset = sorted.length >= 4 ? 2 : sorted.length >= 2 ? 1 : 0;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}

export function sortCarbPool(
  items: FoodItem[],
  strategy: PlanStrategy,
  soft?: SoftPreferences,
): FoodItem[] {
  const copy = [...items];
  if (strategy === "budget") {
    return copy.sort((a, b) => macroValuePerDollar(b) * b.carbs - macroValuePerDollar(a) * a.carbs);
  }
  if (strategy === "quality") {
    return copy.sort((a, b) => {
      const fa = getFoodFlags(a.name);
      const fb = getFoodFlags(b.name);
      const oa = soft?.organic_preferred && fa.organic_eligible ? 1.15 : 1;
      const ob = soft?.organic_preferred && fb.organic_eligible ? 1.15 : 1;
      const pa = (6 - fa.ultra_processed_risk) / 5;
      const pb = (6 - fb.ultra_processed_risk) / 5;
      return (
        (b.calories * ob * fb.whole_food_score * pb) / b.price_per_100g -
        (a.calories * oa * fa.whole_food_score * pa) / a.price_per_100g
      );
    });
  }
  const sorted = copy.sort((a, b) => b.calories / b.price_per_100g - a.calories / a.price_per_100g);
  const offset = sorted.length >= 3 ? 1 : 0;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}

export function sortFatPool(items: FoodItem[], strategy: PlanStrategy, soft?: SoftPreferences): FoodItem[] {
  const copy = [...items];
  const score = (f: FoodItem) => {
    const ff = getFoodFlags(f.name);
    const o = soft?.organic_preferred && ff.organic_eligible ? 1.12 : 1;
    const olive = f.name.toLowerCase().includes("olive") ? 1.15 : 1;
    return (f.fat * o * olive * macroValuePerDollar(f)) / f.price_per_100g;
  };
  if (strategy === "budget") {
    return copy.sort((a, b) => score(b) - score(a));
  }
  if (strategy === "quality") {
    return copy.sort((a, b) => {
      const fa = getFoodFlags(a.name);
      const fb = getFoodFlags(b.name);
      const pa = (6 - fa.ultra_processed_risk) / 5;
      const pb = (6 - fb.ultra_processed_risk) / 5;
      const qa = fa.whole_food_score * pa * (a.fat / Math.max(0.02, a.price_per_100g));
      const qb = fb.whole_food_score * pb * (b.fat / Math.max(0.02, b.price_per_100g));
      return qb - qa;
    });
  }
  const sorted = copy.sort((a, b) => score(b) - score(a));
  const offset = sorted.length >= 2 ? 1 : 0;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}
