/**
 * Adult-oriented daily reference values aligned with common FDA Daily Value figures (MVP).
 * Fiber scales with calorie level; sodium/sugar/sat fat act as upper-bound caps for scoring.
 */
export function getReferenceDailyTargets(params: {
  sex: "male" | "female";
  age: number;
  calorie_target: number;
}): Record<string, number> {
  const cal = Math.max(1200, params.calorie_target);
  const fiber = Math.round(14 * (cal / 1000));

  const base: Record<string, number> = {
    calories: cal,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber_g: fiber,
    sugar_g: 50,
    sodium_mg: 2300,
    sat_fat_g: params.sex === "male" ? 22 : 18,
    vit_a_mcg_rae: 900,
    vit_c_mg: 90,
    vit_d_mcg: 20,
    vit_e_mg: 15,
    vit_k_mcg: 120,
    vit_b1_mg: 1.2,
    vit_b2_mg: 1.3,
    vit_b3_mg: 16,
    vit_b5_mg: 5,
    vit_b6_mg: 1.7,
    vit_b12_mcg: 2.4,
    folate_mcg_dfe: 400,
    calcium_mg: 1000,
    iron_mg: params.sex === "male" ? 8 : 18,
    magnesium_mg: 420,
    potassium_mg: 3400,
    zinc_mg: 11,
    phosphorus_mg: 700,
    selenium_mcg: 55,
    manganese_mg: 2.3,
    copper_mg: 0.9,
  };

  return base;
}
