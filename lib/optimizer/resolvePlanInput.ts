import { computeMacroTargets } from "@/lib/optimizer/computeTargets";
import type {
  HardConstraints,
  ManualMacroInput,
  PlanInput,
  SoftPreferences,
  TargetMode,
  UnitSystem,
} from "@/lib/types/bulkmap";

function parseSoftPreferences(raw: unknown): SoftPreferences | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const out: SoftPreferences = {
    organic_preferred: !!s.organic_preferred,
    budget_first: !!s.budget_first,
    quality_first: !!s.quality_first,
    variety_first: !!s.variety_first,
  };
  if (!out.organic_preferred && !out.budget_first && !out.quality_first && !out.variety_first) {
    return undefined;
  }
  return out;
}

function parseHardConstraints(raw: unknown): HardConstraints | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const h = raw as Record<string, unknown>;
  const out: HardConstraints = {
    gluten_free: !!h.gluten_free,
    dairy_free: !!h.dairy_free,
  };
  if (!out.gluten_free && !out.dairy_free) return undefined;
  return out;
}

function clampDuration(n: number) {
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(30, Math.max(1, Math.round(n)));
}

function parseTargetMode(body: Partial<PlanInput>): TargetMode {
  return body.target_mode === "manual" ? "manual" : "auto";
}

function parseUnitSystem(body: Partial<PlanInput>): UnitSystem {
  return body.unit_system === "imperial" ? "imperial" : "metric";
}

function validateManualMacros(dc: number, pt: number, ct: number, ft: number) {
  if (dc <= 0 || pt <= 0 || ct < 0 || ft < 0) {
    throw new Error("Manual targets: calories and protein must be positive; carbs and fat cannot be negative.");
  }
  if (pt * 4 + ft * 9 > dc * 1.1) {
    throw new Error(
      "Manual targets: protein and fat grams exceed a realistic share of your calorie budget. Adjust percentages or grams.",
    );
  }
}

/** Calories from P/C/F should approximate daily_calories (within tolerance). */
function assertMacroCaloriesClose(dc: number, pt: number, ct: number, ft: number) {
  const kcal = pt * 4 + ct * 4 + ft * 9;
  if (Math.abs(kcal - dc) / dc > 0.08) {
    throw new Error(
      "Macro grams do not match calorie target (check that protein, carb, and fat % add up to 100% of calories).",
    );
  }
}

function deriveGramsFromPercent(dc: number, pp: number, cp: number, fp: number) {
  const sum = pp + cp + fp;
  if (Math.abs(sum - 100) > 0.75) {
    throw new Error("Protein, carb, and fat percentages must add up to 100% (within 0.75%).");
  }
  const protein_g = Math.round((dc * (pp / 100)) / 4);
  const carb_g = Math.round((dc * (cp / 100)) / 4);
  const fat_g = Math.round((dc * (fp / 100)) / 9);
  return { protein_g, carb_g, fat_g };
}

function resolveManualMacros(
  body: Partial<PlanInput>,
  dc: number,
): { protein_g: number; carb_g: number; fat_g: number; style: ManualMacroInput; pct?: { p: number; c: number; f: number } } {
  const explicitStyle = body.manual_macro_input;
  const hasPct =
    body.protein_pct !== undefined && body.carb_pct !== undefined && body.fat_pct !== undefined;
  const hasGrams =
    body.protein_target !== undefined &&
    body.carb_target !== undefined &&
    body.fat_target !== undefined;

  if (explicitStyle === "percent" || (hasPct && explicitStyle !== "grams")) {
    const pp = Number(body.protein_pct);
    const cp = Number(body.carb_pct);
    const fp = Number(body.fat_pct);
    if (![pp, cp, fp].every((n) => Number.isFinite(n))) {
      throw new Error("Manual percent mode requires protein_pct, carb_pct, and fat_pct.");
    }
    const { protein_g, carb_g, fat_g } = deriveGramsFromPercent(dc, pp, cp, fp);
    validateManualMacros(dc, protein_g, carb_g, fat_g);
    assertMacroCaloriesClose(dc, protein_g, carb_g, fat_g);
    return { protein_g, carb_g, fat_g, style: "percent", pct: { p: pp, c: cp, f: fp } };
  }

  if (explicitStyle === "grams" || hasGrams) {
    const pt = Number(body.protein_target);
    const ct = Number(body.carb_target);
    const ft = Number(body.fat_target);
    if (![pt, ct, ft].every((n) => Number.isFinite(n))) {
      throw new Error("Manual gram mode requires protein_target, carb_target, and fat_target.");
    }
    validateManualMacros(dc, pt, ct, ft);
    assertMacroCaloriesClose(dc, pt, ct, ft);
    return { protein_g: Math.round(pt), carb_g: Math.round(ct), fat_g: Math.round(ft), style: "grams" };
  }

  throw new Error("Manual mode: use macro percentages (summing to 100%) or explicit gram targets.");
}

/**
 * Normalizes API body into a full PlanInput with computed targets when profile is sent.
 */
export function resolvePlanInput(body: Partial<PlanInput>): PlanInput {
  const budget_per_week = Number(body.budget_per_week);
  const diet_preferences = body.diet_preferences ?? [];
  const excluded_foods = body.excluded_foods ?? [];
  const hard_constraints = parseHardConstraints(body.hard_constraints);
  const soft_preferences = parseSoftPreferences(body.soft_preferences);
  const target_mode = parseTargetMode(body);
  const unit_system = parseUnitSystem(body);

  if (!Number.isFinite(budget_per_week) || budget_per_week <= 0) {
    throw new Error("Weekly budget must be a positive number.");
  }

  if (body.profile) {
    const p = body.profile;
    if (!p.goal || !p.sex || !p.weight_kg || !p.activity_level) {
      throw new Error("Profile is incomplete. Include goal, sex, weight, and activity level.");
    }
    const weight_kg = Number(p.weight_kg);
    if (!Number.isFinite(weight_kg) || weight_kg <= 0) {
      throw new Error("Weight must be a positive number (kg).");
    }
    const height_cm = Number(p.height_cm);
    const age = Number(p.age);
    if (!Number.isFinite(height_cm) || height_cm <= 0) {
      throw new Error("Height is required (cm) for calorie estimates.");
    }
    if (!Number.isFinite(age) || age <= 0) {
      throw new Error("Age is required for calorie estimates.");
    }

    const duration_days = clampDuration(Number(body.duration_days ?? p.duration_days ?? 7));

    if (target_mode === "manual") {
      const dc = Number(body.daily_calories);
      if (!Number.isFinite(dc) || dc <= 0) {
        throw new Error("Manual mode requires a positive daily_calories value.");
      }
      const macros = resolveManualMacros(body, dc);

      return {
        budget_per_week,
        diet_preferences,
        excluded_foods,
        hard_constraints,
        soft_preferences,
        unit_system,
        target_mode: "manual",
        manual_macro_input: macros.style,
        duration_days,
        profile: {
          goal: p.goal,
          sex: p.sex,
          weight_kg,
          height_cm,
          age,
          activity_level: p.activity_level,
          duration_days,
        },
        daily_calories: Math.round(dc),
        protein_target: macros.protein_g,
        carb_target: macros.carb_g,
        fat_target: macros.fat_g,
        ...(macros.pct
          ? { protein_pct: macros.pct.p, carb_pct: macros.pct.c, fat_pct: macros.pct.f }
          : {}),
      };
    }

    const computed = computeMacroTargets({
      goal: p.goal,
      sex: p.sex,
      weight_kg,
      height_cm,
      age,
      activity_level: p.activity_level,
      duration_days,
      diet_preferences: diet_preferences as PlanInput["diet_preferences"],
    });

    return {
      budget_per_week,
      diet_preferences,
      excluded_foods,
      hard_constraints,
      soft_preferences,
      unit_system,
      target_mode: "auto",
      duration_days: computed.duration_days,
      profile: {
        goal: p.goal,
        sex: p.sex,
        weight_kg,
        height_cm,
        age,
        activity_level: p.activity_level,
        duration_days: computed.duration_days,
      },
      daily_calories: body.daily_calories ?? computed.daily_calories,
      protein_target: body.protein_target ?? computed.protein_g,
      carb_target: body.carb_target ?? computed.carb_g,
      fat_target: body.fat_target ?? computed.fat_g,
    };
  }

  const daily_calories = Number(body.daily_calories);
  const protein_target = Number(body.protein_target);
  const carb_target = Number(body.carb_target ?? 0);
  const fat_target = Number(body.fat_target ?? 0);
  const duration_days = clampDuration(Number(body.duration_days ?? 7));

  if (!Number.isFinite(daily_calories) || daily_calories <= 0) {
    throw new Error("Send a profile object or explicit daily_calories and macro targets.");
  }
  if (!Number.isFinite(protein_target) || protein_target <= 0) {
    throw new Error("Send a profile object or explicit protein_target.");
  }

  let carb_g = carb_target > 0 ? carb_target : undefined;
  let fat_g = fat_target > 0 ? fat_target : undefined;
  if (carb_g === undefined || fat_g === undefined) {
    fat_g = fat_g ?? Math.max(50, Math.round((daily_calories * 0.28) / 9));
    carb_g = carb_g ?? Math.max(0, Math.round((daily_calories - protein_target * 4 - fat_g * 9) / 4));
  }
  if (carb_g < 0 || fat_g < 0) {
    throw new Error("Explicit calories and protein conflict; cannot derive carb/fat targets.");
  }

  return {
    budget_per_week,
    diet_preferences,
    excluded_foods,
    hard_constraints,
    soft_preferences,
    unit_system,
    target_mode: target_mode === "manual" ? "manual" : "auto",
    duration_days,
    daily_calories,
    protein_target,
    carb_target: carb_g,
    fat_target: fat_g,
  };
}
