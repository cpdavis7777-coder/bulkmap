/** Eligibility and quality metadata for catalog items (MVP heuristics). */
export type FoodFlags = {
  gluten_free: boolean;
  contains_dairy: boolean;
  /** 1 = budget / ultra-processed risk, 5 = minimally processed / high nutrient density */
  quality_score: number;
  /** 1 = highly processed, 5 = whole food */
  whole_food_score: number;
  /** 1 = minimally processed, 5 = ultra-processed (NOVA-style proxy for MVP). */
  ultra_processed_risk: number;
  organic_eligible: boolean;
};

export const foodFlagsByName: Record<string, FoodFlags> = {
  "White rice": { gluten_free: true, contains_dairy: false, quality_score: 3, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  "Rolled oats": { gluten_free: false, contains_dairy: false, quality_score: 4, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Whole eggs": { gluten_free: true, contains_dairy: false, quality_score: 5, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Chicken breast": { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  "Ground beef (90/10)": { gluten_free: true, contains_dairy: false, quality_score: 3, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  "Milk (2%)": { gluten_free: true, contains_dairy: true, quality_score: 3, whole_food_score: 3, ultra_processed_risk: 2, organic_eligible: true },
  "Peanut butter": { gluten_free: true, contains_dairy: false, quality_score: 3, whole_food_score: 3, ultra_processed_risk: 3, organic_eligible: true },
  Potatoes: { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Pasta (dry)": { gluten_free: false, contains_dairy: false, quality_score: 2, whole_food_score: 3, ultra_processed_risk: 3, organic_eligible: true },
  "Black beans": { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Lentils (dry)": { gluten_free: true, contains_dairy: false, quality_score: 5, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Greek yogurt": { gluten_free: true, contains_dairy: true, quality_score: 4, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  Tofu: { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  "Olive oil": { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 4, ultra_processed_risk: 2, organic_eligible: true },
  Banana: { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Whole wheat bread": { gluten_free: false, contains_dairy: false, quality_score: 2, whole_food_score: 3, ultra_processed_risk: 3, organic_eligible: true },
  "Canned tuna": { gluten_free: true, contains_dairy: false, quality_score: 3, whole_food_score: 4, ultra_processed_risk: 3, organic_eligible: false },
  Salmon: { gluten_free: true, contains_dairy: false, quality_score: 5, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
  "Cheddar cheese": { gluten_free: true, contains_dairy: true, quality_score: 3, whole_food_score: 3, ultra_processed_risk: 2, organic_eligible: true },
  "Kidney beans": { gluten_free: true, contains_dairy: false, quality_score: 4, whole_food_score: 5, ultra_processed_risk: 1, organic_eligible: true },
};

export function getFoodFlags(name: string): FoodFlags {
  const row = foodFlagsByName[name];
  if (row) return row;
  const whole = 3;
  return {
    gluten_free: false,
    contains_dairy: false,
    quality_score: 3,
    whole_food_score: whole,
    ultra_processed_risk: Math.max(1, Math.min(5, 6 - whole)),
    organic_eligible: false,
  };
}
