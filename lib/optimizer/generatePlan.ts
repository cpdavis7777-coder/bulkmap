import { foods } from "@/lib/data/foods";
import {
  buildMacroCoverageRows,
  buildNutrientCoverageRows,
  mergeMacroAndMicroRows,
  sanitizeNutrientCoverageRows,
} from "@/lib/nutrition/computePlanCoverage";
import { aggregatePeriodNutrients } from "@/lib/nutrition/aggregateNutrients";
import { getReferenceDailyTargets } from "@/lib/nutrition/referenceDaily";
import {
  getMacroDailyRatiosFromTotals,
  validateMacroToleranceFromRatios,
} from "@/lib/optimizer/macroTolerance";
import { normalizeFoodName, isFoodAllowed } from "@/lib/optimizer/dietCompatibility";
import {
  FRUIT_AND_SUGAR_HEAVY,
  MAX_FRUIT_SUGAR_CARB_FRACTION,
  maxGramsForFoodWindow,
  type MaxGramCapOptions,
} from "@/lib/optimizer/foodConstraints";
import { diagnoseInfeasibility } from "@/lib/optimizer/macroFeasibility";
import { formatQuantityForDisplay } from "@/lib/optimizer/formatQuantityDisplay";
import { formatQuantityLabel } from "@/lib/optimizer/formatQuantity";
import { buildPurchaseLink } from "@/lib/optimizer/purchaseLink";
import {
  sortCarbPool,
  sortFatPool,
  sortProteinPool,
  sortProteinPoolForMacroFit,
  type PlanStrategy,
} from "@/lib/optimizer/sortStrategies";
import { buildSubstitutionHints } from "@/lib/optimizer/substitutionHints";
import type { PlanInput, PlanOutput, PlanFoodSelection, TargetSourceDetail } from "@/lib/types/bulkmap";

const CHUNK_PROTEIN = 80;
const CHUNK_CARB = 100;
const CHUNK_FAT = 40;
const CHUNK_OIL = 25;

/** Default planner pass; `feasibility` relaxes variety and prioritizes hitting macros. */
export type GeneratePlanMode = "default" | "feasibility";

/** Filled once per `generatePlan` call when diagnostics are enabled. */
export type PlannerDebugSnapshot = {
  strategy: PlanStrategy;
  mode: GeneratePlanMode;
  shortlisted: { protein: string[]; carb: string[]; fat: string[]; legume: string[] };
  prioritizeMacroFit: boolean;
  periodProteinTargetG: number;
};

type Totals = {
  cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function resolveTargetSourceDetail(input: PlanInput): TargetSourceDetail {
  if (input.target_mode !== "manual") return "auto";
  return input.manual_macro_input === "percent" ? "manual_percent" : "manual_grams";
}

function resolveTargets(input: PlanInput) {
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
      "Incomplete plan input: missing calorie or macro targets. Send profile or full targets from /api/plan.",
    );
  }
  if (dc <= 0 || pt <= 0 || ct < 0 || ft < 0) {
    throw new Error("Invalid targets: calories and protein must be positive; carbs and fat cannot be negative.");
  }
  if (pt * 4 + ft * 9 > dc * 1.08) {
    throw new Error(
      "Unrealistic targets: protein and fat minimums exceed your daily calorie budget. Adjust goal or profile.",
    );
  }
  return {
    daily_calories: dc,
    protein_g: pt,
    carb_g: ct,
    fat_g: ft,
  };
}

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

export function generatePlan(
  input: PlanInput,
  strategy: PlanStrategy = "budget",
  mode: GeneratePlanMode = "default",
  onDebugSnapshot?: (snap: PlannerDebugSnapshot) => void,
): PlanOutput {
  if (!input?.budget_per_week) {
    throw new Error("Missing weekly budget.");
  }

  const targets = resolveTargets(input);
  const days = Math.min(30, Math.max(1, Math.round(input.duration_days ?? 7)));
  const budgetPeriod = input.budget_per_week * (days / 7);

  if (input.budget_per_week < 15) {
    throw new Error(
      "Budget too low: increase weekly budget (reference foods cannot be purchased meaningfully at this level).",
    );
  }

  const excluded = new Set((input.excluded_foods ?? []).map(normalizeFoodName));
  const prefs = input.diet_preferences;
  const hard = input.hard_constraints;
  const soft = input.soft_preferences;
  const isCarnivore = prefs?.includes("carnivore");
  /** Feasibility pass: rank carbs/fats by cost-efficiency, ignore soft preferences. */
  const poolStrategy: PlanStrategy = mode === "feasibility" ? "budget" : strategy;
  const poolSoft = mode === "feasibility" ? undefined : soft;

  const availableFoods = foods.filter((food) => isFoodAllowed(food, prefs, excluded, hard));

  if (availableFoods.length === 0) {
    throw new Error(
      "Exclusions or diet style removed every food in the catalog. Remove some exclusions or relax diet filters.",
    );
  }

  const proteinCandidates = availableFoods.filter((f) => f.role === "protein");
  let proteinPool: typeof proteinCandidates;
  if (mode === "feasibility") {
    proteinPool = sortProteinPoolForMacroFit(proteinCandidates);
  } else if (input.target_mode === "manual" || targets.protein_g >= 185) {
    proteinPool = sortProteinPoolForMacroFit(proteinCandidates).slice(0, 18);
  } else {
    const poolSize = targets.protein_g >= 165 ? 10 : 6;
    proteinPool = sortProteinPool(proteinCandidates, strategy, soft).slice(0, poolSize);
  }

  const legumePool =
    mode === "feasibility"
      ? availableFoods.filter((f) => f.role === "legume")
      : availableFoods.filter((f) => f.role === "legume").slice(0, 3);

  let carbPool = sortCarbPool(
    availableFoods.filter((f) => f.role === "carb"),
    poolStrategy,
    poolSoft,
  );

  if (carbPool.length === 0 && isCarnivore) {
    carbPool = sortCarbPool(
      availableFoods.filter((f) => f.name === "Milk (2%)" || f.name === "Greek yogurt"),
      poolStrategy,
      poolSoft,
    );
  }

  let fatPool = sortFatPool(availableFoods.filter((f) => f.role === "fat"), poolStrategy, poolSoft);
  if (fatPool.length === 0) {
    fatPool = sortFatPool(
      availableFoods.filter((f) => f.role === "protein" && f.fat >= 12),
      poolStrategy,
      poolSoft,
    ).slice(0, 4);
  }

  if (proteinPool.length === 0 && legumePool.length === 0) {
    throw new Error(
      "No protein sources left after filters. Your exclusions or diet choice may be too restrictive.",
    );
  }

  const periodCalories = targets.daily_calories * days;
  const periodProtein = targets.protein_g * days;
  const periodCarbs = targets.carb_g * days;
  const periodFat = targets.fat_g * days;
  const carbRelaxed = targets.carb_g < 45;

  const prioritizeMacroFit =
    mode === "feasibility" ||
    input.target_mode === "manual" ||
    targets.protein_g * days >= 1260;

  const capOpts: MaxGramCapOptions = {
    periodProtein,
    prioritizeMacroFit,
  };

  onDebugSnapshot?.({
    strategy,
    mode,
    shortlisted: {
      protein: proteinPool.map((f) => f.name),
      carb: carbPool.map((f) => f.name),
      fat: fatPool.map((f) => f.name),
      legume: legumePool.map((f) => f.name),
    },
    prioritizeMacroFit,
    periodProteinTargetG: periodProtein,
  });

  const chunkProtein = mode === "feasibility" ? 115 : CHUNK_PROTEIN;
  const chunkCarb = mode === "feasibility" ? 125 : CHUNK_CARB;

  const selected = new Map<string, number>();
  const totals: Totals = { cost: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
  let carbsFromFruitSugar = 0;

  const getFood = (name: string) => availableFoods.find((f) => f.name === name);

  const tryAdd = (name: string, grams: number): boolean => {
    const food = getFood(name);
    if (!food) return false;
    const current = selected.get(name) ?? 0;
    const maxG = maxGramsForFoodWindow(food, days, capOpts);
    if (current + grams > maxG) return false;

    const addCarbs = (food.carbs * grams) / 100;
    if (FRUIT_AND_SUGAR_HEAVY.has(name)) {
      if (carbsFromFruitSugar + addCarbs > periodCarbs * MAX_FRUIT_SUGAR_CARB_FRACTION) {
        return false;
      }
    }

    const addCost = (food.price_per_100g * grams) / 100;
    if (totals.cost + addCost > budgetPeriod) return false;

    selected.set(name, current + grams);
    totals.cost += addCost;
    totals.calories += (food.calories * grams) / 100;
    totals.protein += (food.protein * grams) / 100;
    totals.carbs += addCarbs;
    totals.fat += (food.fat * grams) / 100;
    if (FRUIT_AND_SUGAR_HEAVY.has(name)) {
      carbsFromFruitSugar += addCarbs;
    }
    return true;
  };

  const subtractGrams = (name: string, grams: number): boolean => {
    const food = getFood(name);
    if (!food) return false;
    const cur = selected.get(name) ?? 0;
    const g = Math.min(grams, Math.max(0, cur - 20));
    if (g <= 0) return false;
    const next = cur - g;
    if (next <= 0) selected.delete(name);
    else selected.set(name, next);
    totals.cost -= (food.price_per_100g * g) / 100;
    totals.calories -= (food.calories * g) / 100;
    totals.protein -= (food.protein * g) / 100;
    const cb = (food.carbs * g) / 100;
    totals.carbs -= cb;
    totals.fat -= (food.fat * g) / 100;
    if (FRUIT_AND_SUGAR_HEAVY.has(name)) {
      carbsFromFruitSugar -= cb;
    }
    return true;
  };

  const proteinGoal = mode === "feasibility" ? 0.965 : 0.98;
  const carbGoal = carbRelaxed ? 0.88 : mode === "feasibility" ? 0.96 : 0.97;
  const fatGoal = mode === "feasibility" ? 0.955 : 0.96;
  const calorieGoal = mode === "feasibility" ? 0.965 : 0.97;

  let safety = 0;
  while (totals.protein < periodProtein * proteinGoal && safety < 3500) {
    safety += 1;
    let progressed = false;
    const pool = proteinPool.length > 0 ? proteinPool : legumePool;
    for (const food of pool) {
      if (totals.protein >= periodProtein * proteinGoal) break;
      if (tryAdd(food.name, chunkProtein)) progressed = true;
    }
    if (!progressed) break;
  }

  safety = 0;
  while (totals.protein < periodProtein * proteinGoal && legumePool.length > 0 && safety < 1200) {
    safety += 1;
    let progressed = false;
    for (const food of legumePool) {
      if (totals.protein >= periodProtein * proteinGoal) break;
      if (tryAdd(food.name, 70)) progressed = true;
    }
    if (!progressed) break;
  }

  safety = 0;
  while (totals.carbs < periodCarbs * carbGoal && carbPool.length > 0 && safety < 3500) {
    safety += 1;
    let progressed = false;
    for (const food of carbPool) {
      if (totals.carbs >= periodCarbs * carbGoal) break;
      if (tryAdd(food.name, chunkCarb)) progressed = true;
    }
    if (!progressed) break;
  }

  safety = 0;
  while (totals.fat < periodFat * fatGoal && fatPool.length > 0 && safety < 2000) {
    safety += 1;
    let progressed = false;
    for (const food of fatPool) {
      if (totals.fat >= periodFat * fatGoal) break;
      const chunk = food.name.toLowerCase().includes("oil") ? CHUNK_OIL : CHUNK_FAT;
      if (tryAdd(food.name, chunk)) progressed = true;
    }
    if (!progressed) break;
  }

  safety = 0;
  while (totals.calories < periodCalories * calorieGoal && carbPool.length > 0 && safety < 2500) {
    safety += 1;
    let progressed = false;
    for (const food of carbPool) {
      if (totals.calories >= periodCalories * calorieGoal) break;
      if (tryAdd(food.name, 80)) progressed = true;
    }
    if (!progressed) break;
  }

  safety = 0;
  while (totals.calories < periodCalories * (calorieGoal - 0.02) && fatPool.length > 0 && safety < 1200) {
    safety += 1;
    let progressed = false;
    for (const food of fatPool) {
      if (totals.calories >= periodCalories * calorieGoal) break;
      const chunk = food.name.toLowerCase().includes("oil") ? CHUNK_OIL : 35;
      if (tryAdd(food.name, chunk)) progressed = true;
    }
    if (!progressed) break;
  }

  /** Tighten toward ±10% macro band using remaining budget (prefers fit over minimal spend). */
  let refine = 0;
  while (refine < (mode === "feasibility" ? 1400 : 900)) {
    refine += 1;
    const r = getMacroDailyRatiosFromTotals(totals, days, targets);
    const check = validateMacroToleranceFromRatios(r, { carbRelaxed });
    if (check.ok) break;
    if (r.calories > 1.14) {
      let trimmed = false;
      for (const nm of ["White rice", "Rolled oats", "Pasta (dry)", "Banana", "Whole wheat bread", "Rice cakes"]) {
        if (selected.has(nm) && subtractGrams(nm, 65)) {
          trimmed = true;
          break;
        }
      }
      if (trimmed) continue;
      break;
    }
    let progressed = false;
    if (r.protein < 0.9) {
      const pool = proteinPool.length > 0 ? proteinPool : legumePool;
      for (const food of pool) {
        if (tryAdd(food.name, 50)) {
          progressed = true;
          break;
        }
      }
    } else if (!carbRelaxed && r.carbs < 0.9) {
      for (const food of carbPool) {
        if (tryAdd(food.name, 55)) {
          progressed = true;
          break;
        }
      }
    } else if (r.fat < 0.9) {
      for (const food of fatPool) {
        const chunk = food.name.toLowerCase().includes("oil") ? CHUNK_OIL : 32;
        if (tryAdd(food.name, chunk)) {
          progressed = true;
          break;
        }
      }
    } else if (r.calories < 0.9) {
      for (const food of carbPool) {
        if (tryAdd(food.name, 60)) {
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }

  /** Pull back dominant items when macros overshoot (deterministic trim before validation). */
  let trimI = 0;
  while (trimI < 450) {
    trimI += 1;
    const r = getMacroDailyRatiosFromTotals(totals, days, targets);
    if (r.calories <= 1.1 && r.carbs <= 1.1 && r.fat <= 1.1 && r.protein <= 1.1) break;
    let progressed = false;
    if (r.carbs > 1.08 && selected.has("Banana")) {
      progressed = subtractGrams("Banana", 70) || progressed;
    }
    if (r.fat > 1.08 && selected.has("Cheddar cheese")) {
      progressed = subtractGrams("Cheddar cheese", 50) || progressed;
    }
    if (r.calories > 1.09 || r.carbs > 1.09) {
      for (const nm of ["Banana", "Peanut butter", "White rice", "Rolled oats"]) {
        if (selected.has(nm) && subtractGrams(nm, 55)) {
          progressed = true;
          break;
        }
      }
    }
    if (r.fat > 1.09) {
      for (const nm of ["Peanut butter", "Olive oil", "Cheddar cheese"]) {
        if (selected.has(nm) && subtractGrams(nm, 45)) {
          progressed = true;
          break;
        }
      }
    }
    if (r.calories > 1.1) {
      const keys = Array.from(selected.keys());
      for (const nm of keys) {
        if (subtractGrams(nm, 40)) {
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }

  /** Final band repair: trim macro overshoots, then fill residual deficits with small deterministic adds. */
  let bandRepair = 0;
  while (bandRepair < 700) {
    bandRepair += 1;
    const r = getMacroDailyRatiosFromTotals(totals, days, targets);
    const check = validateMacroToleranceFromRatios(r, { carbRelaxed });
    if (check.ok) break;

    const over =
      r.calories > 1.1 || r.carbs > 1.1 || r.fat > 1.1 || r.protein > 1.1;
    if (over) {
      let progressed = false;
      if (r.carbs > 1.08) {
        for (const nm of [
          "Banana",
          "White rice",
          "Rolled oats",
          "Pasta (dry)",
          "Whole wheat bread",
          "Whole wheat tortillas",
          "Rice cakes",
          "Potatoes",
        ]) {
          if (selected.has(nm) && subtractGrams(nm, 48)) {
            progressed = true;
            break;
          }
        }
      }
      if (!progressed && r.fat > 1.08) {
        for (const nm of ["Peanut butter", "Olive oil", "Cheddar cheese"]) {
          if (selected.has(nm) && subtractGrams(nm, 42)) {
            progressed = true;
            break;
          }
        }
      }
      if (!progressed && r.protein > 1.08) {
        for (const nm of ["Whey protein powder", "Canned tuna", "Chicken breast", "Liquid egg whites"]) {
          if (selected.has(nm) && subtractGrams(nm, 40)) {
            progressed = true;
            break;
          }
        }
      }
      if (!progressed && r.calories > 1.08) {
        for (const nm of Array.from(selected.keys())) {
          if (subtractGrams(nm, 38)) {
            progressed = true;
            break;
          }
        }
      }
      if (!progressed) break;
      continue;
    }

    let progressed = false;
    if (r.protein < 0.92) {
      const pool = proteinPool.length > 0 ? proteinPool : legumePool;
      for (const food of pool) {
        if (tryAdd(food.name, 38)) {
          progressed = true;
          break;
        }
      }
    } else if (!carbRelaxed && r.carbs < 0.92) {
      for (const food of carbPool) {
        if (tryAdd(food.name, 42)) {
          progressed = true;
          break;
        }
      }
    } else if (r.fat < 0.92) {
      for (const food of fatPool) {
        const chunk = food.name.toLowerCase().includes("oil") ? CHUNK_OIL : 30;
        if (tryAdd(food.name, chunk)) {
          progressed = true;
          break;
        }
      }
    } else if (r.calories < 0.92) {
      for (const food of carbPool) {
        if (tryAdd(food.name, 48)) {
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }

  if (totals.cost > budgetPeriod) {
    throw new Error(
      "Budget cap exceeded for this plan length: raise weekly budget, shorten duration, or relax targets.",
    );
  }

  const tolCheck = validateMacroToleranceFromRatios(
    getMacroDailyRatiosFromTotals(totals, days, targets),
    { carbRelaxed },
  );
  if (!tolCheck.ok) {
    const diag = diagnoseInfeasibility({
      input,
      availableFoods,
      days,
      periodProtein,
      budgetPeriod,
      capOpts,
      totals,
    });
    throw new Error(`${tolCheck.message} [${diag.code}] ${diag.detail}`);
  }

  const substitutions = buildSubstitutionHints(
    Array.from(selected.keys()),
    {
      excluded,
      preferences: prefs,
      hard_constraints: hard,
      catalog: foods,
    },
  );

  const hintByOriginal = new Map(substitutions.map((h) => [h.original, h.alternatives]));

  const foodsOut: PlanFoodSelection[] = Array.from(selected.entries())
    .flatMap(([name, quantity_g]) => {
      const food = getFood(name);
      if (!food) return [];
      const cost = Number(((food.price_per_100g * quantity_g) / 100).toFixed(2));
      const opts = hintByOriginal.get(food.name)?.slice(0, 3) ?? [];
      const link = buildPurchaseLink(food.name);
      const units = input.unit_system ?? "metric";
      const row: PlanFoodSelection = {
        name: food.name,
        quantity_g: Math.round(quantity_g),
        quantity_label:
          units === "imperial"
            ? formatQuantityForDisplay(food.name, quantity_g, "imperial")
            : formatQuantityLabel(food.name, quantity_g),
        category: food.category,
        group: food.group,
        cost,
        calories: Number(((food.calories * quantity_g) / 100).toFixed(1)),
        protein: Number(((food.protein * quantity_g) / 100).toFixed(1)),
        carbs: Number(((food.carbs * quantity_g) / 100).toFixed(1)),
        fat: Number(((food.fat * quantity_g) / 100).toFixed(1)),
        purchase_url: link.url,
        purchase_source_label: link.source_label,
        substitution_options: opts.map((o) => ({
          name: o.name,
          reason: o.reason,
        })),
      };
      return [row];
    })
    .sort((a, b) => b.cost - a.cost);

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

  const nutrient_totals_period = flattenMicroToTotals(microPeriod, {
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  });

  return {
    foods: foodsOut,
    grocery_groups,
    substitutions,
    targets: {
      daily_calories: targets.daily_calories,
      protein_g: targets.protein_g,
      carb_g: targets.carb_g,
      fat_g: targets.fat_g,
      duration_days: days,
      target_source: resolveTargetSourceDetail(input),
    },
    nutrient_reference_daily: nutrientRef,
    nutrient_totals_period,
    nutrient_coverage,
    total_cost: Number(totals.cost.toFixed(2)),
    calories: Number(totals.calories.toFixed(1)),
    protein: Number(totals.protein.toFixed(1)),
    carbs: Number(totals.carbs.toFixed(1)),
    fat: Number(totals.fat.toFixed(1)),
  };
}
