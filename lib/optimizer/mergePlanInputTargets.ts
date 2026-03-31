import type { PlanInput, PlanOutput } from "@/lib/types/bulkmap";

/**
 * Client-stored `PlanInput` often omits resolved calorie/macro fields (server-only from `resolvePlanInput`).
 * Merge targets from a generated plan so swaps/recompute always have numeric targets.
 */
export function mergePlanInputWithPlanTargets(
  input: PlanInput,
  plan: Pick<PlanOutput, "targets">,
): PlanInput {
  const t = plan.targets;
  return {
    ...input,
    daily_calories: input.daily_calories ?? t.daily_calories,
    protein_target: input.protein_target ?? t.protein_g,
    carb_target: input.carb_target ?? t.carb_g,
    fat_target: input.fat_target ?? t.fat_g,
    duration_days: input.duration_days ?? t.duration_days,
    unit_system: input.unit_system,
    manual_macro_input: input.manual_macro_input,
  };
}
