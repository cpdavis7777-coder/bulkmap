/** Extended nutrients per 100g edible portion (approximate reference values). */
export type NutrientsPer100g = {
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  sat_fat_g: number;
  vit_a_mcg_rae: number;
  vit_c_mg: number;
  vit_d_mcg: number;
  vit_e_mg: number;
  vit_k_mcg: number;
  vit_b1_mg: number;
  vit_b2_mg: number;
  vit_b3_mg: number;
  vit_b5_mg: number;
  vit_b6_mg: number;
  vit_b12_mcg: number;
  folate_mcg_dfe: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  phosphorus_mg: number;
  selenium_mcg: number;
  manganese_mg: number;
  copper_mg: number;
};

/** Macros use under/ok/over; beneficial micros use under/ok/above; caps use ok/over (over = over limit). */
export type NutrientCoverageStatus = "under" | "ok" | "above" | "over";

export type NutrientCoverageRow = {
  key: string;
  label: string;
  unit: string;
  /** Daily reference used for % (scaled to period when view=period). */
  target_daily: number;
  actual_period: number;
  actual_daily_avg: number;
  pct_of_daily_target: number;
  status: NutrientCoverageStatus;
  /** True if lower is better (sodium caps, sugar caps). */
  is_cap?: boolean;
};
