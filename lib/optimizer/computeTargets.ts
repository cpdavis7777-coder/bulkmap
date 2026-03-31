import type { DietStyle, GoalType } from "@/lib/types/bulkmap";

export type ProfileForTargets = {
  goal: GoalType;
  sex: "male" | "female";
  weight_kg: number;
  height_cm: number;
  age: number;
  activity_level: "light" | "moderate" | "high";
  /** Shopping window length; validated and echoed for plan scaling (does not change daily TDEE). */
  duration_days: number;
  diet_preferences?: DietStyle[];
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Mifflin–St Jeor BMR × activity factor, then goal adjustment.
 * Protein g/kg by goal; fat floor; carbs fill remainder.
 * Carnivore: forces very low carbs and raises fat to close calories.
 */
export function computeMacroTargets(profile: ProfileForTargets): {
  daily_calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  duration_days: number;
} {
  const w = profile.weight_kg;
  const h = profile.height_cm;
  const age = profile.age;
  const duration_days = clamp(Math.round(profile.duration_days || 7), 1, 30);

  if (w < 30 || w > 250) {
    throw new Error("Weight looks unrealistic (use 30–250 kg).");
  }
  if (h < 120 || h > 230) {
    throw new Error("Height looks unrealistic (use 120–230 cm).");
  }
  if (age < 14 || age > 90) {
    throw new Error("Age should be between 14 and 90 for these estimates.");
  }

  const bmr =
    profile.sex === "male"
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161;

  const activityMult =
    profile.activity_level === "light" ? 1.375 : profile.activity_level === "moderate" ? 1.55 : 1.725;

  let calories = Math.round(bmr * activityMult);

  if (profile.goal === "bulk") {
    calories += 400;
  } else if (profile.goal === "cut") {
    calories -= 500;
  }

  const proteinPerKg =
    profile.goal === "cut" ? 2.2 : profile.goal === "bulk" ? 2.0 : 1.8;
  const proteinAdjust = profile.sex === "female" ? -0.1 : 0;
  const protein_g = Math.round(w * (proteinPerKg + proteinAdjust));

  const prefs = profile.diet_preferences ?? [];
  const isCarnivore = prefs.includes("carnivore");
  const isKeto = prefs.includes("keto");

  let fat_g = Math.max(52, Math.round(w * 0.75));
  const maxFatByPct = Math.floor((calories * 0.38) / 9);
  fat_g = Math.min(fat_g, maxFatByPct);

  let carb_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);

  if (carb_g < 0) {
    fat_g = Math.max(48, Math.floor((calories * 0.3) / 9));
    carb_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  }

  if (carb_g < 0) {
    throw new Error(
      "Could not balance macros: calorie target is too tight for this protein minimum. Adjust goal or profile.",
    );
  }

  if (isKeto) {
    carb_g = Math.min(carb_g, Math.max(25, Math.round(w * 0.35)));
    fat_g = Math.round((calories - protein_g * 4 - carb_g * 4) / 9);
    fat_g = clamp(fat_g, 50, Math.floor((calories * 0.45) / 9));
  }

  if (isCarnivore) {
    carb_g = Math.min(carb_g, 22);
    fat_g = Math.round((calories - protein_g * 4 - carb_g * 4) / 9);
    fat_g = clamp(fat_g, 55, Math.floor((calories * 0.5) / 9));
  }

  if (protein_g * 4 >= calories * 0.45) {
    throw new Error(
      "Unrealistic targets: protein share is too high for the calorie budget. Check height, weight, or goal.",
    );
  }

  return {
    daily_calories: calories,
    protein_g,
    carb_g: Math.max(0, carb_g),
    fat_g: Math.max(40, fat_g),
    duration_days,
  };
}
