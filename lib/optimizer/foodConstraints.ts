import type { FoodItem } from "@/lib/data/foods";

/** High free-sugar / fruit carb sources — cap share of total carb grams. */
export const FRUIT_AND_SUGAR_HEAVY = new Set(["Banana"]);

/** Dense cheese used for fat — cap weekly quantity to avoid unrealistic plans. */
export const CHEESE_FAT_HEAVY = new Set(["Cheddar cheese"]);

/** Max fraction of period carb grams from fruit/sugar-heavy carb items. */
export const MAX_FRUIT_SUGAR_CARB_FRACTION = 0.22;

export type MaxGramCapOptions = {
  /** Total protein needed for the full shopping window (all days), grams. */
  periodProtein?: number;
  /** When true, raise caps so high-protein targets can be met with a realistic mix of foods. */
  prioritizeMacroFit?: boolean;
};

/**
 * Per-food max grams for the shopping window (scales with duration).
 * Prevents single-item dominance (e.g. excessive bananas or cheese).
 * With prioritizeMacroFit + periodProtein, protein sources scale up so bodybuilding-style
 * targets are not impossible due to an artificially low weekly cap per item.
 */
export function maxGramsForFoodWindow(food: FoodItem, days: number, opts?: MaxGramCapOptions): number {
  const scale = Math.max(days / 7, 0.35);
  const name = food.name;
  const prioritize = opts?.prioritizeMacroFit ?? false;
  const periodProtein = opts?.periodProtein;

  if (food.role === "protein" && prioritize && periodProtein && periodProtein > 0 && !CHEESE_FAT_HEAVY.has(name)) {
    const density = Math.max(0.01, food.protein / 100);
    const share = name.toLowerCase().includes("whey") || name.toLowerCase().includes("powder") ? 0.65 : 0.52;
    const fromTarget = (share * periodProtein) / density;
    const baseCap = 950 * scale;
    return Math.round(Math.min(5200 * scale, Math.max(baseCap, fromTarget)));
  }

  if (name === "Banana") return Math.round(400 * scale);
  if (name === "Cheddar cheese") return Math.round(320 * scale);
  if (name === "Peanut butter") return Math.round(450 * scale);
  if (food.role === "fat" && name.toLowerCase().includes("oil")) {
    return Math.round(420 * scale);
  }
  if (food.role === "carb") {
    if (name === "White rice" || name === "Rolled oats" || name === "Pasta (dry)") {
      return Math.round(1100 * scale);
    }
    return Math.round(850 * scale);
  }
  if (food.role === "legume") {
    if (prioritize && periodProtein && periodProtein > 0) {
      const density = Math.max(0.01, food.protein / 100);
      const fromTarget = (0.35 * periodProtein) / density;
      return Math.round(Math.min(2200 * scale, Math.max(750 * scale, fromTarget)));
    }
    return Math.round(750 * scale);
  }
  if (food.role === "protein") {
    if (CHEESE_FAT_HEAVY.has(name)) return Math.round(320 * scale);
    return Math.round(950 * scale);
  }
  return Math.round(800 * scale);
}
