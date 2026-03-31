import type { NutrientCoverageRow } from "@/lib/types/nutrition";

export type GoalType = "bulk" | "cut" | "maintain";

export type DietStyle =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescetarian"
  | "keto"
  | "carnivore";

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

export type MacroCoverage = {
  key: MacroKey;
  label: string;
  target: number;
  actual: number;
  unit: "kcal" | "g";
};

export type MicronutrientCoverage = {
  nutrient: string;
  target: number;
  actual: number;
  unit: string;
};

export type GroceryItem = {
  name: string;
  quantity: string;
  estimatedCost: number;
  reason: string;
  topNutrients: string[];
};

export type GroceryGroup = {
  group: string;
  items: GroceryItem[];
};

export type Substitution = {
  original: string;
  alternatives: {
    name: string;
    reason: "cheaper" | "similar_macros" | "similar_micros" | "diet_match";
    costDelta: number;
  }[];
};

export type TargetMode = "auto" | "manual";

/** How manual calorie/macro targets were entered. */
export type ManualMacroInput = "percent" | "grams";

/** Resolved target provenance for results copy. */
export type TargetSourceDetail = "auto" | "manual_percent" | "manual_grams";

export type UnitSystem = "metric" | "imperial";

export type PlanSummary = {
  title: string;
  durationDays: number;
  budget: number;
  estimatedCost: number;
  /** @deprecated prefer overallFitScore */
  nutrientCoverageScore: number;
  caloriesPerDay: number;
  proteinPerDay: number;
  targetMode: TargetMode;
  targetSourceDetail: TargetSourceDetail;
  macroFitScore: number;
  microFitScore: number;
  beneficialMicroFitScore: number;
  limitComplianceScore: number;
  overallFitScore: number;
  macroBandOk: boolean;
  unitSystem: UnitSystem;
};

export type SavedPlan = {
  id: string;
  title: string;
  goal: GoalType;
  style: DietStyle;
  createdAt: string;
  totalCost: number;
  coverageScore: number;
};

export type PlanProfileInput = {
  goal: GoalType;
  sex: "male" | "female";
  weight_kg: number;
  height_cm: number;
  age: number;
  activity_level: "light" | "moderate" | "high";
  /** Shopping window; scales grocery quantities and period budget (default 7). */
  duration_days?: number;
};

/** Hard filters — exclude foods that do not comply. */
export type HardConstraints = {
  gluten_free?: boolean;
  dairy_free?: boolean;
};

/** Soft ranking signals — influence scoring and default variant, never hard-exclude alone. */
export type SoftPreferences = {
  organic_preferred?: boolean;
  budget_first?: boolean;
  quality_first?: boolean;
  variety_first?: boolean;
};

export type PlanInput = {
  budget_per_week: number;
  diet_preferences?: DietStyle[];
  excluded_foods?: string[];
  hard_constraints?: HardConstraints;
  soft_preferences?: SoftPreferences;
  /** When set, server derives calories + macros from profile (unless overrides below are sent). */
  profile?: PlanProfileInput;
  /** Plan length in days (1–30); scales shop size and spend vs weekly budget. */
  duration_days?: number;
  /** Display quantities in metric or imperial on results (stored client-side). */
  unit_system?: UnitSystem;
  /** Auto = derive from profile; Manual = use explicit targets below. */
  target_mode?: TargetMode;
  /** When manual: percent split (sums to 100) or explicit grams. */
  manual_macro_input?: ManualMacroInput;
  daily_calories?: number;
  /** Manual % mode: percent of calories from each macro (must sum to ~100). */
  protein_pct?: number;
  carb_pct?: number;
  fat_pct?: number;
  protein_target?: number;
  carb_target?: number;
  fat_target?: number;
};

export type GroceryCategory =
  | "proteins"
  | "carbs"
  | "fats"
  | "mixed";

export type PlanFoodSelection = {
  name: string;
  quantity_g: number;
  /** Human-readable, e.g. "1.2 kg" or "2 × 12 eggs" */
  quantity_label: string;
  category: GroceryCategory;
  group: string;
  cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  purchase_url: string;
  /** e.g. "Web search" — structured retailer builders can set this later. */
  purchase_source_label?: string;
  substitution_options: { name: string; reason: string }[];
};

export type PlanSubstitutionHint = {
  original: string;
  alternatives: { name: string; reason: "cheaper" | "similar_protein" | "similar_carb" }[];
};

export type PlanVariantId = "budget" | "quality" | "variety";

export type PlanScores = {
  macro_fit: number;
  /** Combined micro score (beneficial + limits) for compact display. */
  micro_fit: number;
  beneficial_micro_fit: number;
  limit_compliance: number;
  /** How well the plan uses available budget without treating spend as the goal (0–1). */
  cost_efficiency: number;
  variety_score: number;
  preference_alignment: number;
  /** Heuristic food quality: whole foods, processing, density (0–1). */
  quality_score: number;
  /** Combined headline score (0–1). */
  overall_fit: number;
};

export type PlanOutput = {
  foods: PlanFoodSelection[];
  /** Grouped for display; same items as foods, organized by section. */
  grocery_groups: { group: string; items: PlanFoodSelection[] }[];
  substitutions: PlanSubstitutionHint[];
  /** Resolved daily targets (from profile or explicit input). */
  targets: {
    daily_calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    duration_days: number;
    /** Whether targets came from profile, manual %, or manual grams. */
    target_source?: TargetSourceDetail;
  };
  /** Daily reference map used for coverage % (same keys as aggregate micro map). */
  nutrient_reference_daily: Record<string, number>;
  /** Period totals for key nutrients (macros + micro keys). */
  nutrient_totals_period: Record<string, number>;
  nutrient_coverage: NutrientCoverageRow[];
  total_cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PlanVariantResult = PlanOutput & {
  variant_id: PlanVariantId;
  variant_label: string;
  badges: string[];
  scores: PlanScores;
};

/** Developer / QA only — omit in production clients. Set via `x-bulkmap-planner-debug: 1` on `/api/plan`. */
export type PlannerDiagnostics = {
  generation_mode: "default" | "feasibility";
  default_pass_failed: boolean;
  first_error_message?: string;
  variants: {
    variant_id: PlanVariantId;
    /** Optimizer strategy used to rank pools (budget / quality / variety). */
    strategy: "budget" | "quality" | "variety";
    macro_fit: number;
    total_cost: number;
    prioritize_macro_caps: boolean;
    period_protein_target_g: number;
    shortlisted: {
      protein: string[];
      carb: string[];
      fat: string[];
      legume: string[];
    };
  }[];
};

export type PlanBundleOutput = {
  variants: PlanVariantResult[];
  recommended_variant_id: PlanVariantId;
  /** Present when request includes `x-bulkmap-planner-debug: 1` or env `BULKMAP_PLANNER_DEBUG=1`. */
  planner_diagnostics?: PlannerDiagnostics;
};
