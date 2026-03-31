"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DietStyle, GoalType, PlanBundleOutput, PlanInput, TargetMode, UnitSystem } from "@/lib/types/bulkmap";
import { ftInToTotalInches, inchesToCm, lbToKg } from "@/lib/units/measurement";

type ManualMacroStyle = "percent" | "grams";

type FormState = {
  goal: GoalType;
  unitSystem: UnitSystem;
  targetMode: TargetMode;
  manualMacroStyle: ManualMacroStyle;
  manualCalories: string;
  manualProteinPct: string;
  manualCarbPct: string;
  manualFatPct: string;
  manualProteinG: string;
  manualCarbG: string;
  manualFatG: string;
  age: string;
  sex: "male" | "female";
  heightCm: string;
  weightKg: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  activityLevel: "light" | "moderate" | "high";
  dietStyle: DietStyle;
  glutenFree: boolean;
  dairyFree: boolean;
  organicPreferred: boolean;
  budgetFirst: boolean;
  qualityFirst: boolean;
  varietyFirst: boolean;
  weeklyBudget: string;
  durationDays: string;
  exclusions: string;
};

const initialState: FormState = {
  goal: "bulk",
  unitSystem: "metric",
  targetMode: "auto",
  manualMacroStyle: "percent",
  manualCalories: "2600",
  manualProteinPct: "30",
  manualCarbPct: "40",
  manualFatPct: "30",
  manualProteinG: "165",
  manualCarbG: "280",
  manualFatG: "75",
  age: "28",
  sex: "male",
  heightCm: "180",
  weightKg: "82",
  heightFt: "5",
  heightIn: "11",
  weightLb: "181",
  activityLevel: "moderate",
  dietStyle: "omnivore",
  glutenFree: false,
  dairyFree: false,
  organicPreferred: false,
  budgetFirst: true,
  qualityFirst: false,
  varietyFirst: false,
  weeklyBudget: "110",
  durationDays: "7",
  exclusions: "shellfish, mushrooms",
};

const stepTitles = ["Goal", "Profile", "Diet & rules", "Budget + duration", "Exclusions"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progress = useMemo(() => ((step + 1) / stepTitles.length) * 100, [step]);

  const derivedManualGrams = useMemo(() => {
    const dc = Number(form.manualCalories);
    const pp = Number(form.manualProteinPct);
    const cp = Number(form.manualCarbPct);
    const fp = Number(form.manualFatPct);
    if (![dc, pp, cp, fp].every((n) => Number.isFinite(n))) return null;
    if (Math.abs(pp + cp + fp - 100) > 0.8) return null;
    return {
      pg: Math.round((dc * (pp / 100)) / 4),
      cg: Math.round((dc * (cp / 100)) / 4),
      fg: Math.round((dc * (fp / 100)) / 9),
    };
  }, [form.manualCalories, form.manualProteinPct, form.manualCarbPct, form.manualFatPct]);

  const onNext = async () => {
    if (step === stepTitles.length - 1) {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        const input = buildPlanInput(form);
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const payload = (await response.json()) as PlanBundleOutput | { error: string };
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error : "Plan generation failed.");
        }
        const bundle = payload as PlanBundleOutput;
        const v0 = bundle.variants[0];
        const enriched: PlanInput = {
          ...input,
          daily_calories: v0.targets.daily_calories,
          protein_target: v0.targets.protein_g,
          carb_target: v0.targets.carb_g,
          fat_target: v0.targets.fat_g,
          duration_days: v0.targets.duration_days,
          unit_system: input.unit_system,
        };

        localStorage.setItem("bulkmap:lastPlan", JSON.stringify({ input: enriched, output: bundle }));
        router.push("/results");
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to generate plan.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setStep((value) => value + 1);
  };

  const onPrev = () => {
    setSubmitError(null);
    setStep((value) => Math.max(0, value - 1));
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-7 text-zinc-100 shadow-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Step {step + 1} of {stepTitles.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold tracking-tight">{stepTitles[step]}</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Build your baseline plan now. You can refine every setting later.
      </p>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {(["bulk", "cut", "maintain"] as GoalType[]).map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => setForm((value) => ({ ...value, goal }))}
                className={`cursor-pointer rounded-xl border px-4 py-5 text-left capitalize transition ${
                  form.goal === goal
                    ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                <p className="text-base font-medium">{goal}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-zinc-400">Units</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, unitSystem: "metric" })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    form.unitSystem === "metric"
                      ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="font-semibold">Metric</span>
                  <span className="mt-1 block text-xs text-zinc-500">cm · kg</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, unitSystem: "imperial" })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    form.unitSystem === "imperial"
                      ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="font-semibold">Imperial</span>
                  <span className="mt-1 block text-xs text-zinc-500">ft · in · lb</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Age" value={form.age} onChange={(age) => setForm({ ...form, age })} />
              <LabeledSelect
                label="Sex"
                value={form.sex}
                onChange={(sex) => setForm({ ...form, sex: sex as FormState["sex"] })}
                options={["male", "female"]}
              />
              {form.unitSystem === "metric" ? (
                <>
                  <LabeledInput
                    label="Height (cm)"
                    value={form.heightCm}
                    onChange={(heightCm) => setForm({ ...form, heightCm })}
                  />
                  <LabeledInput
                    label="Weight (kg)"
                    value={form.weightKg}
                    onChange={(weightKg) => setForm({ ...form, weightKg })}
                  />
                </>
              ) : (
                <>
                  <LabeledInput
                    label="Height (ft)"
                    value={form.heightFt}
                    onChange={(heightFt) => setForm({ ...form, heightFt })}
                  />
                  <LabeledInput
                    label="Height (in)"
                    value={form.heightIn}
                    onChange={(heightIn) => setForm({ ...form, heightIn })}
                  />
                  <LabeledInput
                    label="Weight (lb)"
                    value={form.weightLb}
                    onChange={(weightLb) => setForm({ ...form, weightLb })}
                  />
                </>
              )}
              <div className="sm:col-span-2">
                <LabeledSelect
                  label="Activity level"
                  value={form.activityLevel}
                  onChange={(activityLevel) =>
                    setForm({ ...form, activityLevel: activityLevel as FormState["activityLevel"] })
                  }
                  options={["light", "moderate", "high"]}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-zinc-400">Calorie &amp; macro targets</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, targetMode: "auto" })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    form.targetMode === "auto"
                      ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="font-semibold">Auto targets</span>
                  <span className="mt-1 block text-xs text-zinc-500">From profile, activity, and goal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, targetMode: "manual" })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    form.targetMode === "manual"
                      ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <span className="font-semibold">Manual targets</span>
                  <span className="mt-1 block text-xs text-zinc-500">Calories + macro split or grams</span>
                </button>
              </div>
            </div>

            {form.targetMode === "manual" && (
              <div className="space-y-3">
                <LabeledInput
                  label="Daily calories (kcal)"
                  value={form.manualCalories}
                  onChange={(manualCalories) => setForm({ ...form, manualCalories })}
                />
                <p className="text-xs text-zinc-500">Macro setup</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, manualMacroStyle: "percent" })}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      form.manualMacroStyle === "percent"
                        ? "border-emerald-400 bg-emerald-400/15"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    Macro %
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, manualMacroStyle: "grams" })}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      form.manualMacroStyle === "grams"
                        ? "border-emerald-400 bg-emerald-400/15"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    Exact grams
                  </button>
                </div>
                {form.manualMacroStyle === "percent" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                      label="Protein % of calories"
                      value={form.manualProteinPct}
                      onChange={(manualProteinPct) => setForm({ ...form, manualProteinPct })}
                    />
                    <LabeledInput
                      label="Carbs % of calories"
                      value={form.manualCarbPct}
                      onChange={(manualCarbPct) => setForm({ ...form, manualCarbPct })}
                    />
                    <LabeledInput
                      label="Fat % of calories"
                      value={form.manualFatPct}
                      onChange={(manualFatPct) => setForm({ ...form, manualFatPct })}
                    />
                    <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300">
                      {derivedManualGrams ? (
                        <p>
                          Derived:{" "}
                          <span className="font-medium text-zinc-100">
                            P {derivedManualGrams.pg}g · C {derivedManualGrams.cg}g · F {derivedManualGrams.fg}g
                          </span>{" "}
                          / day
                        </p>
                      ) : (
                        <p className="text-amber-200/90">
                          Enter percents that sum to 100% (within 0.8%) to see derived grams.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LabeledInput
                      label="Protein (g / day)"
                      value={form.manualProteinG}
                      onChange={(manualProteinG) => setForm({ ...form, manualProteinG })}
                    />
                    <LabeledInput
                      label="Carbs (g / day)"
                      value={form.manualCarbG}
                      onChange={(manualCarbG) => setForm({ ...form, manualCarbG })}
                    />
                    <LabeledInput
                      label="Fat (g / day)"
                      value={form.manualFatG}
                      onChange={(manualFatG) => setForm({ ...form, manualFatG })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-zinc-400">Primary eating pattern</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                ["omnivore", "vegetarian", "vegan", "pescetarian", "keto", "carnivore"] as DietStyle[]
              ).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setForm((value) => ({ ...value, dietStyle: style }))}
                  className={`cursor-pointer rounded-xl border px-4 py-4 text-left capitalize transition ${
                    form.dietStyle === style
                      ? "border-emerald-400 bg-emerald-400/15 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm text-zinc-400">Hard filters</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleRow
                  label="Gluten-free"
                  checked={form.glutenFree}
                  onChange={(glutenFree) => setForm({ ...form, glutenFree })}
                />
                <ToggleRow
                  label="Dairy-free"
                  checked={form.dairyFree}
                  onChange={(dairyFree) => setForm({ ...form, dairyFree })}
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-zinc-400">Shopping preferences (ranking)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleRow
                  label="Organic preferred"
                  checked={form.organicPreferred}
                  onChange={(organicPreferred) => setForm({ ...form, organicPreferred })}
                />
                <ToggleRow
                  label="Budget first"
                  checked={form.budgetFirst}
                  onChange={(budgetFirst) => setForm({ ...form, budgetFirst })}
                />
                <ToggleRow
                  label="Quality first"
                  checked={form.qualityFirst}
                  onChange={(qualityFirst) => setForm({ ...form, qualityFirst })}
                />
                <ToggleRow
                  label="Variety first"
                  checked={form.varietyFirst}
                  onChange={(varietyFirst) => setForm({ ...form, varietyFirst })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label="Weekly budget ($)"
              value={form.weeklyBudget}
              onChange={(weeklyBudget) => setForm({ ...form, weeklyBudget })}
            />
            <LabeledInput
              label="Duration (days)"
              value={form.durationDays}
              onChange={(durationDays) => setForm({ ...form, durationDays })}
            />
          </div>
        )}

        {step === 4 && (
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            Foods to avoid
            <textarea
              value={form.exclusions}
              onChange={(event) => setForm({ ...form, exclusions: event.target.value })}
              className="min-h-28 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-emerald-400/30 focus:ring-2"
              placeholder="e.g. shellfish, lactose, peanuts"
            />
          </label>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" disabled={step === 0 || isSubmitting} onClick={onPrev}>
          Previous
        </Button>
        <Button disabled={isSubmitting} onClick={onNext}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              Generating...
            </span>
          ) : step === stepTitles.length - 1 ? (
            "Generate Plan"
          ) : (
            "Next"
          )}
        </Button>
      </div>

      {submitError && (
        <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {submitError}
        </div>
      )}
    </div>
  );
}

function buildPlanInput(form: FormState): PlanInput {
  const weeklyBudget = Number(form.weeklyBudget || "0");
  const exclusions = form.exclusions
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let heightCm: number;
  let weightKg: number;
  if (form.unitSystem === "metric") {
    heightCm = Number(form.heightCm);
    weightKg = Number(form.weightKg);
  } else {
    const totalIn = ftInToTotalInches(Number(form.heightFt), Number(form.heightIn));
    heightCm = inchesToCm(totalIn);
    weightKg = lbToKg(Number(form.weightLb));
  }

  const age = Number(form.age);
  const durationDays = Math.min(30, Math.max(1, Math.round(Number(form.durationDays) || 7)));

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("Enter a valid weight so we can size your macros.");
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error("Enter a valid height for calorie estimates.");
  }
  if (!Number.isFinite(age) || age < 14) {
    throw new Error("Enter a valid age (14+) for calorie estimates.");
  }

  const soft_preferences = {
    organic_preferred: form.organicPreferred,
    budget_first: form.budgetFirst,
    quality_first: form.qualityFirst,
    variety_first: form.varietyFirst,
  };
  const hasSoft = Object.values(soft_preferences).some(Boolean);

  const hard_constraints = {
    gluten_free: form.glutenFree,
    dairy_free: form.dairyFree,
  };
  const hasHard = form.glutenFree || form.dairyFree;

  const base = {
    budget_per_week: weeklyBudget,
    diet_preferences: [form.dietStyle],
    excluded_foods: exclusions,
    unit_system: form.unitSystem,
    ...(hasHard ? { hard_constraints } : {}),
    ...(hasSoft ? { soft_preferences } : {}),
    duration_days: durationDays,
    profile: {
      goal: form.goal,
      sex: form.sex,
      weight_kg: Math.round(weightKg * 10) / 10,
      height_cm: Math.round(heightCm * 10) / 10,
      age: Math.round(age),
      activity_level: form.activityLevel,
      duration_days: durationDays,
    },
  };

  if (form.targetMode === "manual") {
    const dc = Number(form.manualCalories);
    if (!Number.isFinite(dc) || dc <= 0) {
      throw new Error("Enter a positive daily calorie target.");
    }
    if (form.manualMacroStyle === "percent") {
      const pp = Number(form.manualProteinPct);
      const cp = Number(form.manualCarbPct);
      const fp = Number(form.manualFatPct);
      if (![pp, cp, fp].every((n) => Number.isFinite(n))) {
        throw new Error("Enter protein, carb, and fat percentages.");
      }
      if (Math.abs(pp + cp + fp - 100) > 0.8) {
        throw new Error("Protein, carb, and fat percentages must add up to 100%.");
      }
      return {
        ...base,
        target_mode: "manual" as const,
        manual_macro_input: "percent" as const,
        daily_calories: Math.round(dc),
        protein_pct: pp,
        carb_pct: cp,
        fat_pct: fp,
      };
    }
    const pg = Number(form.manualProteinG);
    const cg = Number(form.manualCarbG);
    const fg = Number(form.manualFatG);
    if (![dc, pg, cg, fg].every((n) => Number.isFinite(n))) {
      throw new Error("Enter valid numbers for manual calorie and macro targets.");
    }
    return {
      ...base,
      target_mode: "manual" as const,
      manual_macro_input: "grams" as const,
      daily_calories: Math.round(dc),
      protein_target: Math.round(pg),
      carb_target: Math.round(cg),
      fat_target: Math.round(fg),
    };
  }

  return {
    ...base,
    target_mode: "auto" as const,
  };
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 hover:border-zinc-600">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-emerald-400"
      />
    </label>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-emerald-400/30 focus:ring-2"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-emerald-400/30 focus:ring-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
