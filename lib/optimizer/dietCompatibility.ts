import { CARNIVORE_ALLOWED_FOOD_NAMES } from "@/lib/data/carnivoreAllowlist";
import { getFoodFlags } from "@/lib/data/foodFlags";
import type { FoodItem } from "@/lib/data/foods";
import type { DietStyle, HardConstraints } from "@/lib/types/bulkmap";

export function normalizeFoodName(value: string) {
  return value.trim().toLowerCase();
}

/** True if this catalog item fits the selected diet style(s). */
export function isDietCompatible(food: FoodItem, preferences: DietStyle[] | undefined): boolean {
  if (!preferences || preferences.length === 0 || preferences.includes("omnivore")) {
    return true;
  }

  const tags = food.tags;

  if (preferences.includes("vegan")) return tags.includes("vegan");
  if (preferences.includes("vegetarian")) return tags.includes("vegetarian") || tags.includes("vegan");
  if (preferences.includes("pescetarian")) {
    return tags.includes("pescetarian") || tags.includes("vegetarian") || tags.includes("vegan");
  }
  if (preferences.includes("carnivore")) {
    return CARNIVORE_ALLOWED_FOOD_NAMES.has(food.name);
  }
  if (preferences.includes("keto")) return !tags.includes("carb");

  return true;
}

export function matchesHardConstraints(food: FoodItem, hard: HardConstraints | undefined): boolean {
  if (!hard) return true;
  const flags = getFoodFlags(food.name);
  if (hard.gluten_free && !flags.gluten_free) {
    return false;
  }
  if (hard.dairy_free && flags.contains_dairy) {
    return false;
  }
  return true;
}

export function isFoodAllowed(
  food: FoodItem,
  preferences: DietStyle[] | undefined,
  excludedNormalized: Set<string>,
  hardConstraints?: HardConstraints,
): boolean {
  if (excludedNormalized.has(normalizeFoodName(food.name))) {
    return false;
  }
  if (!matchesHardConstraints(food, hardConstraints)) {
    return false;
  }
  return isDietCompatible(food, preferences);
}
