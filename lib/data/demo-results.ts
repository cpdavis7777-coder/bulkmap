import type {
  GroceryGroup,
  MacroCoverage,
  MicronutrientCoverage,
  PlanSummary,
  SavedPlan,
  Substitution,
} from "@/lib/types/bulkmap";

export const planSummary: PlanSummary = {
  title: "Lean Bulk | Balanced Performance",
  durationDays: 7,
  budget: 115,
  estimatedCost: 108.4,
  nutrientCoverageScore: 92,
  caloriesPerDay: 2875,
  proteinPerDay: 192,
  targetMode: "auto",
  targetSourceDetail: "auto",
  macroFitScore: 88,
  microFitScore: 84,
  beneficialMicroFitScore: 86,
  limitComplianceScore: 90,
  overallFitScore: 86,
  macroBandOk: true,
  unitSystem: "metric",
};

export const macroCoverage: MacroCoverage[] = [
  { key: "calories", label: "Calories", target: 2900, actual: 2875, unit: "kcal" },
  { key: "protein", label: "Protein", target: 190, actual: 192, unit: "g" },
  { key: "carbs", label: "Carbs", target: 330, actual: 318, unit: "g" },
  { key: "fat", label: "Fat", target: 78, actual: 82, unit: "g" },
];

export const micronutrientCoverage: MicronutrientCoverage[] = [
  { nutrient: "Fiber", target: 35, actual: 38, unit: "g" },
  { nutrient: "Magnesium", target: 420, actual: 406, unit: "mg" },
  { nutrient: "Iron", target: 8, actual: 10.8, unit: "mg" },
  { nutrient: "Potassium", target: 3400, actual: 3225, unit: "mg" },
  { nutrient: "Vitamin D", target: 15, actual: 12.1, unit: "mcg" },
  { nutrient: "Vitamin C", target: 90, actual: 124, unit: "mg" },
];

export const groceryGroups: GroceryGroup[] = [
  {
    group: "Proteins",
    items: [
      {
        name: "Chicken breast",
        quantity: "2.1 kg",
        estimatedCost: 24.5,
        reason: "High protein per dollar with low sat fat.",
        topNutrients: ["protein", "niacin", "selenium"],
      },
      {
        name: "Greek yogurt (2%)",
        quantity: "2 kg",
        estimatedCost: 11.2,
        reason: "Convenient protein plus calcium.",
        topNutrients: ["protein", "calcium", "B12"],
      },
    ],
  },
  {
    group: "Carbs / Grains / Starches",
    items: [
      {
        name: "Jasmine rice",
        quantity: "1.8 kg",
        estimatedCost: 4.6,
        reason: "Low-cost carb base for training days.",
        topNutrients: ["carbs", "manganese"],
      },
      {
        name: "Rolled oats",
        quantity: "1.2 kg",
        estimatedCost: 4.1,
        reason: "Fiber and magnesium dense breakfast anchor.",
        topNutrients: ["fiber", "magnesium", "iron"],
      },
    ],
  },
  {
    group: "Vegetables",
    items: [
      {
        name: "Spinach",
        quantity: "600 g",
        estimatedCost: 5.8,
        reason: "Folate and vitamin K support micronutrient coverage.",
        topNutrients: ["vitamin K", "folate", "magnesium"],
      },
      {
        name: "Frozen broccoli",
        quantity: "1.5 kg",
        estimatedCost: 6.7,
        reason: "High value fiber + vitamin C with low prep time.",
        topNutrients: ["fiber", "vitamin C", "potassium"],
      },
    ],
  },
  {
    group: "Fats",
    items: [
      {
        name: "Extra virgin olive oil",
        quantity: "500 ml",
        estimatedCost: 8.9,
        reason: "Helps hit fat floor with better fat quality.",
        topNutrients: ["mono fats", "vitamin E"],
      },
      {
        name: "Natural peanut butter",
        quantity: "800 g",
        estimatedCost: 7.5,
        reason: "Calorie-dense and protein-supportive.",
        topNutrients: ["fat", "protein", "magnesium"],
      },
    ],
  },
];

export const substitutions: Substitution[] = [
  {
    original: "Chicken breast",
    alternatives: [
      { name: "Turkey breast", reason: "similar_macros", costDelta: 1.7 },
      { name: "Canned tuna", reason: "cheaper", costDelta: -2.4 },
      { name: "Lean pork loin", reason: "similar_micros", costDelta: -0.8 },
    ],
  },
  {
    original: "Greek yogurt (2%)",
    alternatives: [
      { name: "Skyr", reason: "similar_macros", costDelta: 0.9 },
      { name: "Cottage cheese", reason: "cheaper", costDelta: -1.6 },
      { name: "Soy yogurt", reason: "diet_match", costDelta: 1.2 },
    ],
  },
];

export const savedPlans: SavedPlan[] = [
  {
    id: "plan_lean_bulk_01",
    title: "Lean Bulk Omnivore",
    goal: "bulk",
    style: "omnivore",
    createdAt: "2026-03-28",
    totalCost: 108.4,
    coverageScore: 92,
  },
  {
    id: "plan_fat_loss_hp_01",
    title: "Fat Loss High-Protein",
    goal: "cut",
    style: "omnivore",
    createdAt: "2026-03-26",
    totalCost: 96.2,
    coverageScore: 88,
  },
  {
    id: "plan_vegan_budget_01",
    title: "Vegan on a Budget",
    goal: "maintain",
    style: "vegan",
    createdAt: "2026-03-21",
    totalCost: 84.7,
    coverageScore: 83,
  },
];
