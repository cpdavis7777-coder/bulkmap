import type { FoodItem } from "@/lib/data/foods";
import { isFoodAllowed, normalizeFoodName } from "@/lib/optimizer/dietCompatibility";
import type { HardConstraints, PlanInput, PlanSubstitutionHint } from "@/lib/types/bulkmap";

/** Simple deterministic substitutes for common list leaders. */
const RULES: Record<string, { cheaper?: string; similar_protein?: string; similar_carb?: string }> = {
  "Chicken breast": {
    cheaper: "Canned tuna",
    similar_protein: "Ground beef (90/10)",
  },
  "Ground beef (90/10)": {
    cheaper: "Chicken breast",
    similar_protein: "Whole eggs",
  },
  "White rice": {
    cheaper: "Potatoes",
    similar_carb: "Pasta (dry)",
  },
  "Rolled oats": {
    cheaper: "Whole wheat bread",
    similar_carb: "Banana",
  },
  "Pasta (dry)": {
    cheaper: "White rice",
    similar_carb: "Potatoes",
  },
  "Whole eggs": {
    cheaper: "Milk (2%)",
    similar_protein: "Greek yogurt",
  },
  "Greek yogurt": {
    cheaper: "Milk (2%)",
    similar_protein: "Whole eggs",
  },
  "Peanut butter": {
    cheaper: "Olive oil",
    similar_carb: "Banana",
  },
  "Salmon": {
    cheaper: "Canned tuna",
    similar_protein: "Chicken breast",
  },
  "Tofu": {
    cheaper: "Black beans",
    similar_protein: "Lentils (dry)",
  },
};

function foodByName(catalog: FoodItem[], name: string): FoodItem | undefined {
  return catalog.find((f) => f.name === name);
}

function isValidAlternative(
  name: string,
  original: string,
  ctx: {
    excluded: Set<string>;
    preferences: PlanInput["diet_preferences"];
    hard_constraints?: HardConstraints;
    catalog: FoodItem[];
  },
): boolean {
  if (normalizeFoodName(name) === normalizeFoodName(original)) return false;
  const food = foodByName(ctx.catalog, name);
  if (!food) return false;
  return isFoodAllowed(food, ctx.preferences, ctx.excluded, ctx.hard_constraints);
}

export function buildSubstitutionHints(
  selectedNames: string[],
  ctx: {
    excluded: Set<string>;
    preferences: PlanInput["diet_preferences"];
    hard_constraints?: HardConstraints;
    catalog: FoodItem[];
  },
): PlanSubstitutionHint[] {
  const out: PlanSubstitutionHint[] = [];
  const seen = new Set<string>();

  for (const original of selectedNames) {
    const rule = RULES[original];
    if (!rule || seen.has(original)) continue;
    seen.add(original);
    const alternatives: PlanSubstitutionHint["alternatives"] = [];
    if (rule.cheaper && isValidAlternative(rule.cheaper, original, ctx)) {
      alternatives.push({ name: rule.cheaper, reason: "cheaper" });
    }
    if (rule.similar_protein && isValidAlternative(rule.similar_protein, original, ctx)) {
      alternatives.push({ name: rule.similar_protein, reason: "similar_protein" });
    }
    if (rule.similar_carb && isValidAlternative(rule.similar_carb, original, ctx)) {
      alternatives.push({ name: rule.similar_carb, reason: "similar_carb" });
    }
    if (alternatives.length > 0) {
      out.push({ original, alternatives: alternatives.slice(0, 2) });
    }
  }

  return out.slice(0, 8);
}
