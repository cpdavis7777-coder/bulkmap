import { foods, type FoodItem } from "@/lib/data/foods";
import { aggregatePeriodNutrients } from "@/lib/nutrition/aggregateNutrients";
import {
  buildMacroCoverageRows,
  buildNutrientCoverageRows,
  mergeMacroAndMicroRows,
  sanitizeNutrientCoverageRows,
} from "@/lib/nutrition/computePlanCoverage";
import { getReferenceDailyTargets } from "@/lib/nutrition/referenceDaily";
import { normalizeFoodName, isFoodAllowed } from "@/lib/optimizer/dietCompatibility";
import { formatQuantityForDisplay } from "@/lib/optimizer/formatQuantityDisplay";
import { buildPurchaseLink } from "@/lib/optimizer/purchaseLink";
import { buildSubstitutionHints } from "@/lib/optimizer/substitutionHints";
import type { PlanFoodSelection, PlanInput, PlanOutput } from "@/lib/types/bulkmap";

function flattenMicroToTotals(
  micro: ReturnType<typeof aggregatePeriodNutrients>,
  macros: { calories: number; protein: number; carbs: number; fat: number },
): Record<string, number> {
  return {
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    ...micro,
  };
}

/** Rebuild plan aggregates after client-side line-item edits (swap quantities). */
export function recomputePlanFromFoods(
  input: PlanInput,
  selections: { name: string; quantity_g: number }[],
): Pick<
  PlanOutput,
  | "foods"
  | "grocery_groups"
  | "substitutions"
  | "nutrient_reference_daily"
  | "nutrient_totals_period"
  | "nutrient_coverage"
  | "total_cost"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
> {
  const excluded = new Set((input.excluded_foods ?? []).map(normalizeFoodName));
  const prefs = input.diet_preferences;
  const hard = input.hard_constraints;
  const days = Math.min(30, Math.max(1, Math.round(input.duration_days ?? 7)));
  const dc = input.daily_calories;
  const pt = input.protein_target;
  const ct = input.carb_target;
  const ft = input.fat_target;
  if (
    dc === undefined ||
    pt === undefined ||
    ct === undefined ||
    ft === undefined ||
    !Number.isFinite(dc) ||
    !Number.isFinite(pt) ||
    !Number.isFinite(ct) ||
    !Number.isFinite(ft)
  ) {
    throw new Error(
      "Missing daily calorie/macro targets. Regenerate the plan from onboarding or ensure the stored plan includes resolved targets.",
    );
  }
  const targets = {
    daily_calories: dc,
    protein_g: pt,
    carb_g: ct,
    fat_g: ft,
  };

  const getFood = (name: string): FoodItem | undefined => foods.find((f) => f.name === name);

  const foodsOut: PlanFoodSelection[] = [];
  for (const row of selections) {
    const food = getFood(row.name);
    if (!food || !isFoodAllowed(food, prefs, excluded, hard)) continue;
    const g = row.quantity_g;
    const cost = Number(((food.price_per_100g * g) / 100).toFixed(2));
    const link = buildPurchaseLink(food.name);
    const units = input.unit_system ?? "metric";
    foodsOut.push({
      name: food.name,
      quantity_g: Math.round(g),
      quantity_label: formatQuantityForDisplay(food.name, g, units),
      category: food.category,
      group: food.group,
      cost,
      calories: Number(((food.calories * g) / 100).toFixed(1)),
      protein: Number(((food.protein * g) / 100).toFixed(1)),
      carbs: Number(((food.carbs * g) / 100).toFixed(1)),
      fat: Number(((food.fat * g) / 100).toFixed(1)),
      purchase_url: link.url,
      purchase_source_label: link.source_label,
      substitution_options: [],
    });
  }

  const substitutions = buildSubstitutionHints(
    foodsOut.map((f) => f.name),
    { excluded, preferences: prefs, hard_constraints: hard, catalog: foods },
  );
  const hintByOriginal = new Map(substitutions.map((h) => [h.original, h.alternatives]));
  for (const item of foodsOut) {
    item.substitution_options =
      hintByOriginal.get(item.name)?.slice(0, 3).map((o) => ({ name: o.name, reason: o.reason })) ?? [];
  }

  const totals = foodsOut.reduce(
    (acc, f) => {
      acc.cost += f.cost;
      acc.calories += f.calories;
      acc.protein += f.protein;
      acc.carbs += f.carbs;
      acc.fat += f.fat;
      return acc;
    },
    { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const groupOrder = new Map<string, number>();
  foods.forEach((f, idx) => groupOrder.set(f.group, idx));
  const groupedMap = new Map<string, PlanFoodSelection[]>();
  for (const item of foodsOut) {
    const list = groupedMap.get(item.group) ?? [];
    list.push(item);
    groupedMap.set(item.group, list);
  }
  const grocery_groups = Array.from(groupedMap.entries())
    .sort((a, b) => (groupOrder.get(a[0]) ?? 99) - (groupOrder.get(b[0]) ?? 99))
    .map(([group, items]) => ({ group, items }));

  const sex = input.profile?.sex ?? "male";
  const age = input.profile?.age ?? 30;
  const baseRef = getReferenceDailyTargets({
    sex,
    age,
    calorie_target: targets.daily_calories,
  });
  const nutrientRef: Record<string, number> = {
    ...baseRef,
    calories: targets.daily_calories,
    protein: targets.protein_g,
    carbs: targets.carb_g,
    fat: targets.fat_g,
  };

  const microPeriod = aggregatePeriodNutrients(foodsOut.map((f) => ({ name: f.name, quantity_g: f.quantity_g })));
  const microRows = buildNutrientCoverageRows({
    days,
    microPeriod,
    referenceDaily: nutrientRef,
  });
  const macroRows = buildMacroCoverageRows({
    days,
    period: {
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    },
    dailyTargets: {
      calories: targets.daily_calories,
      protein_g: targets.protein_g,
      carb_g: targets.carb_g,
      fat_g: targets.fat_g,
    },
  });
  const nutrient_coverage = sanitizeNutrientCoverageRows(mergeMacroAndMicroRows(macroRows, microRows));

  return {
    foods: foodsOut.sort((a, b) => b.cost - a.cost),
    grocery_groups,
    substitutions,
    nutrient_reference_daily: nutrientRef,
    nutrient_totals_period: flattenMicroToTotals(microPeriod, totals),
    nutrient_coverage,
    total_cost: Number(totals.cost.toFixed(2)),
    calories: Number(totals.calories.toFixed(1)),
    protein: Number(totals.protein.toFixed(1)),
    carbs: Number(totals.carbs.toFixed(1)),
    fat: Number(totals.fat.toFixed(1)),
  };
}
