import { emptyNutrients, getNutrientsPer100g } from "@/lib/data/nutrientsByFoodName";
import type { NutrientsPer100g } from "@/lib/types/nutrition";

const KEYS = [
  "fiber_g",
  "sugar_g",
  "sodium_mg",
  "sat_fat_g",
  "vit_a_mcg_rae",
  "vit_c_mg",
  "vit_d_mcg",
  "vit_e_mg",
  "vit_k_mcg",
  "vit_b1_mg",
  "vit_b2_mg",
  "vit_b3_mg",
  "vit_b5_mg",
  "vit_b6_mg",
  "vit_b12_mcg",
  "folate_mcg_dfe",
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "potassium_mg",
  "zinc_mg",
  "phosphorus_mg",
  "selenium_mcg",
  "manganese_mg",
  "copper_mg",
] as const;

export function sumNutrientsForGrams(foodName: string, grams: number): NutrientsPer100g {
  const n = getNutrientsPer100g(foodName);
  const factor = grams / 100;
  const out = { ...n };
  for (const k of KEYS) {
    out[k] = Number(((n[k] ?? 0) * factor).toFixed(4));
  }
  return out;
}

export function addNutrientObjects(a: NutrientsPer100g, b: NutrientsPer100g): NutrientsPer100g {
  const out = { ...a };
  for (const k of KEYS) {
    out[k] = Number(((a[k] ?? 0) + (b[k] ?? 0)).toFixed(4));
  }
  return out;
}

export function aggregatePeriodNutrients(
  selections: { name: string; quantity_g: number }[],
): NutrientsPer100g {
  let acc = emptyNutrients();
  for (const row of selections) {
    acc = addNutrientObjects(acc, sumNutrientsForGrams(row.name, row.quantity_g));
  }
  return acc;
}
