import { foods } from "@/lib/data/foods";
import { mergePlanInputWithPlanTargets } from "@/lib/optimizer/mergePlanInputTargets";
import { recomputePlanFromFoods } from "@/lib/optimizer/recomputePlanFromFoods";
import { normalizeFoodName, isFoodAllowed } from "@/lib/optimizer/dietCompatibility";
import type { PlanOutput, PlanInput } from "@/lib/types/bulkmap";

/**
 * Replace one food with another; grams chosen to approximate the same protein contribution.
 */
export function swapFoodInPlan(
  plan: PlanOutput,
  input: PlanInput,
  fromName: string,
  toName: string,
): PlanOutput | null {
  const excluded = new Set((input.excluded_foods ?? []).map(normalizeFoodName));
  const fromFood = foods.find((f) => f.name === fromName);
  const toFood = foods.find((f) => f.name === toName);
  if (!fromFood || !toFood) return null;
  if (!isFoodAllowed(toFood, input.diet_preferences, excluded, input.hard_constraints)) {
    return null;
  }

  const line = plan.foods.find((f) => f.name === fromName);
  if (!line) return null;
  if (fromName === toName) return plan;

  const gramsFrom = line.quantity_g;
  const pFrom = fromFood.protein / 100;
  const pTo = toFood.protein / 100;
  let gramsTo = pTo > 0 ? Math.round((gramsFrom * pFrom) / pTo) : gramsFrom;
  gramsTo = Math.max(50, gramsTo);

  const map = new Map<string, number>();
  for (const f of plan.foods) {
    if (f.name === fromName) continue;
    map.set(f.name, f.quantity_g);
  }
  map.set(toName, (map.get(toName) ?? 0) + gramsTo);

  const selections = Array.from(map.entries()).map(([name, quantity_g]) => ({ name, quantity_g }));
  const resolvedInput = mergePlanInputWithPlanTargets(input, plan);
  const rebuilt = recomputePlanFromFoods(resolvedInput, selections);

  return {
    ...plan,
    ...rebuilt,
    targets: plan.targets,
  };
}
