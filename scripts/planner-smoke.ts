/**
 * Run: npx tsx scripts/planner-smoke.ts
 * Exercises resolvePlanInput + generatePlanBundle for manual QA cases (no HTTP).
 */
import { generatePlanBundle } from "../lib/optimizer/planBundle";
import { resolvePlanInput } from "../lib/optimizer/resolvePlanInput";
import { macroBandOk } from "../lib/optimizer/scoring";
import type { DietStyle } from "../lib/types/bulkmap";

const profile = {
  goal: "bulk" as const,
  sex: "male" as const,
  weight_kg: 80,
  height_cm: 180,
  age: 28,
  activity_level: "moderate" as const,
  duration_days: 7,
};

const cases: {
  id: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  diet: DietStyle[];
  budget: number;
}[] = [
  { id: "3000_403030_omni_120", kcal: 3000, p: 40, c: 30, f: 30, diet: ["omnivore"], budget: 120 },
  { id: "2500_353530_omni_100", kcal: 2500, p: 35, c: 35, f: 30, diet: ["omnivore"], budget: 100 },
  { id: "2000_403030_omni_90", kcal: 2000, p: 40, c: 30, f: 30, diet: ["omnivore"], budget: 90 },
  { id: "2200_304030_veg_110", kcal: 2200, p: 30, c: 40, f: 30, diet: ["vegetarian"], budget: 110 },
];

for (const c of cases) {
  const body = {
    budget_per_week: c.budget,
    diet_preferences: c.diet,
    excluded_foods: [] as string[],
    target_mode: "manual" as const,
    manual_macro_input: "percent" as const,
    daily_calories: c.kcal,
    protein_pct: c.p,
    carb_pct: c.c,
    fat_pct: c.f,
    duration_days: 7,
    unit_system: "metric" as const,
    profile,
  };

  try {
    const input = resolvePlanInput(body);
    const out = generatePlanBundle(input, { includeDiagnostics: true });
    const v0 = out.variants[0];
    const diag = out.planner_diagnostics;
    const codeMatch = diag?.first_error_message?.match(/\[([^\]]+)\]/);
    console.log(
      JSON.stringify({
        case: c.id,
        ok: true,
        generation_mode: diag?.generation_mode ?? null,
        default_pass_failed: diag?.default_pass_failed ?? null,
        first_error_code: codeMatch?.[1] ?? null,
        macro_fit_score_pct: Math.round(v0.scores.macro_fit * 1000) / 10,
        macro_band_ok: macroBandOk(v0),
        estimated_cost: v0.total_cost,
        recommended: out.recommended_variant_id,
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const codeMatch = msg.match(/\[([^\]]+)\]/);
    console.log(
      JSON.stringify({
        case: c.id,
        ok: false,
        error: msg.slice(0, 500),
        code: codeMatch?.[1] ?? null,
      }),
    );
  }
}
