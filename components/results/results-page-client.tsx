"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NutrientCoveragePanel,
  type CoverageViewMode,
} from "@/components/results/nutrient-coverage-panel";
import { SummaryCards } from "@/components/results/summary-cards";
import { Button } from "@/components/ui/button";
import { formatQuantityForDisplay } from "@/lib/optimizer/formatQuantityDisplay";
import { mergePlanInputWithPlanTargets } from "@/lib/optimizer/mergePlanInputTargets";
import { macroBandOk, scorePlan } from "@/lib/optimizer/scoring";
import { swapFoodInPlan } from "@/lib/optimizer/swapFood";
import type {
  PlanBundleOutput,
  PlanInput,
  PlanOutput,
  PlanSummary,
  PlanVariantId,
  PlanVariantResult,
  TargetSourceDetail,
} from "@/lib/types/bulkmap";

type StoredPlan = {
  input: PlanInput;
  output: PlanBundleOutput | PlanOutput;
};

const STORAGE_KEY = "bulkmap:lastPlan";

const fallbackInput: PlanInput = {
  budget_per_week: 115,
  diet_preferences: ["omnivore"],
  excluded_foods: [],
  target_mode: "auto",
  unit_system: "metric",
  duration_days: 7,
  profile: {
    goal: "bulk",
    sex: "male",
    weight_kg: 82,
    height_cm: 180,
    age: 28,
    activity_level: "moderate",
    duration_days: 7,
  },
};

/** Legacy single-plan payloads from localStorage */
function migrateToBundle(raw: StoredPlan["output"]): PlanBundleOutput | null {
  if (raw && typeof raw === "object" && "variants" in raw && Array.isArray((raw as PlanBundleOutput).variants)) {
    return raw as PlanBundleOutput;
  }
  if (
    raw &&
    typeof raw === "object" &&
    "grocery_groups" in raw &&
    (raw as PlanOutput).targets &&
    typeof (raw as PlanOutput).targets.duration_days === "number"
  ) {
    const single = raw as PlanOutput;
    const stubScores = {
      macro_fit: 0.5,
      micro_fit: 0.5,
      beneficial_micro_fit: 0.5,
      limit_compliance: 0.5,
      cost_efficiency: 0.5,
      variety_score: 0.5,
      preference_alignment: 0.5,
      quality_score: 0.5,
      overall_fit: 0.5,
    };
    return {
      variants: [
        {
          ...single,
          targets: {
            ...single.targets,
            target_source: (single.targets.target_source ?? "auto") as TargetSourceDetail,
          },
          variant_id: "budget",
          variant_label: "Your plan",
          badges: [] as string[],
          scores: stubScores,
        },
      ],
      recommended_variant_id: "budget",
    };
  }
  return null;
}

async function requestPlan(input: PlanInput): Promise<PlanBundleOutput> {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as PlanBundleOutput | { error: string };
  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : "Failed to generate plan.");
  }
  return payload as PlanBundleOutput;
}

function enrichInputFromBundle(input: PlanInput, bundle: PlanBundleOutput): PlanInput {
  const v = bundle.variants[0];
  if (!v?.targets) return input;
  return {
    ...input,
    daily_calories: input.daily_calories ?? v.targets.daily_calories,
    protein_target: input.protein_target ?? v.targets.protein_g,
    carb_target: input.carb_target ?? v.targets.carb_g,
    fat_target: input.fat_target ?? v.targets.fat_g,
    duration_days: input.duration_days ?? v.targets.duration_days,
  };
}

function mergeVariantAfterSwap(
  base: PlanVariantResult,
  updated: PlanOutput,
  input: PlanInput,
): PlanVariantResult {
  const merged: PlanVariantResult = {
    ...base,
    ...updated,
    variant_id: base.variant_id,
    variant_label: base.variant_label,
    badges: base.badges,
  };
  const resolvedInput = mergePlanInputWithPlanTargets(input, merged);
  const scores = scorePlan(merged, resolvedInput);
  return { ...merged, scores };
}

export function ResultsPageClient() {
  const [input, setInput] = useState<PlanInput | null>(null);
  const [bundle, setBundle] = useState<PlanBundleOutput | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<PlanVariantId>("budget");
  const [editedVariants, setEditedVariants] = useState<Partial<Record<PlanVariantId, PlanVariantResult>>>({});
  const [coverageView, setCoverageView] = useState<CoverageViewMode>("daily");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateFromInput = useCallback(async (nextInput: PlanInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const output = await requestPlan(nextInput);
      const enriched = enrichInputFromBundle(nextInput, output);
      setInput(enriched);
      setBundle(output);
      setEditedVariants({});
      setSelectedVariantId(output.recommended_variant_id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ input: enriched, output }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan generation failed.");
      setBundle(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredPlan;
        const migrated = migrateToBundle(stored.output);
        if (stored.input && migrated) {
          setInput(enrichInputFromBundle(stored.input, migrated));
          setBundle(migrated);
          setSelectedVariantId(migrated.recommended_variant_id);
          setEditedVariants({});
          setIsLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    void generateFromInput(fallbackInput);
  }, [generateFromInput]);

  const plan = useMemo((): PlanVariantResult | null => {
    if (!bundle) return null;
    const edited = editedVariants[selectedVariantId];
    if (edited) return edited;
    return bundle.variants.find((v) => v.variant_id === selectedVariantId) ?? bundle.variants[0] ?? null;
  }, [bundle, selectedVariantId, editedVariants]);

  const handleSwap = useCallback(
    (fromName: string, toName: string) => {
      if (!bundle || !input || !plan) return;
      const next = swapFoodInPlan(plan, input, fromName, toName);
      if (!next) return;
      setEditedVariants((prev) => ({
        ...prev,
        [selectedVariantId]: mergeVariantAfterSwap(plan, next, input),
      }));
    },
    [bundle, input, plan, selectedVariantId],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#07080c] px-6 py-10 text-zinc-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center shadow-[0_0_60px_-20px_rgba(163,230,53,0.15)] backdrop-blur-sm">
          <div className="mx-auto size-9 animate-spin rounded-full border-2 border-lime-400/40 border-r-transparent" />
          <h1 className="font-display mt-5 text-xl font-bold text-white">Generating your optimized plan…</h1>
          <p className="mt-2 text-sm text-zinc-400">Calculating foods, quantities, and costs.</p>
        </div>
      </main>
    );
  }

  if (!bundle || !input || !plan || !plan.targets || plan.targets.duration_days === undefined) {
    return (
      <main className="min-h-screen bg-[#07080c] px-6 py-10 text-zinc-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/25 bg-red-950/30 p-6 backdrop-blur-sm">
          <h1 className="font-display text-2xl font-bold text-white">Plan generation failed</h1>
          <p className="mt-3 text-zinc-300">{error ?? "No plan data found."}</p>
          <Button className="mt-4" onClick={() => void generateFromInput(fallbackInput)}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const t = plan.targets;
  const days = t.duration_days;
  const periodBudget = input.budget_per_week * (days / 7);

  const targetSourceDetail: TargetSourceDetail =
    plan.targets.target_source ??
    (input.target_mode === "manual"
      ? input.manual_macro_input === "percent"
        ? "manual_percent"
        : "manual_grams"
      : "auto");
  const targetMode = input.target_mode ?? "auto";

  const planSummary: PlanSummary = {
    title: plan.variant_label,
    durationDays: days,
    budget: periodBudget,
    estimatedCost: plan.total_cost,
    nutrientCoverageScore: Math.round(plan.scores.overall_fit * 100),
    caloriesPerDay: Math.round(plan.calories / days),
    proteinPerDay: Math.round(plan.protein / days),
    targetMode,
    targetSourceDetail,
    macroFitScore: Math.round(plan.scores.macro_fit * 100),
    microFitScore: Math.round(plan.scores.micro_fit * 100),
    beneficialMicroFitScore: Math.round(plan.scores.beneficial_micro_fit * 100),
    limitComplianceScore: Math.round(plan.scores.limit_compliance * 100),
    overallFitScore: Math.round(plan.scores.overall_fit * 100),
    macroBandOk: macroBandOk(plan),
    unitSystem: input.unit_system ?? "metric",
  };

  const groups = plan.grocery_groups?.length ? plan.grocery_groups : [];
  const coverageRows = plan.nutrient_coverage ?? [];

  return (
    <main className="min-h-screen bg-[#07080c] px-6 py-10 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,oklch(0.28_0.1_145/0.15),transparent)]" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/90">Results</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Your grocery plans
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-400">
            {targetSourceDetail === "auto"
              ? "Targets derived from your profile (age, height, weight, activity, goal)."
              : targetSourceDetail === "manual_percent"
                ? "Using your manual calorie target and protein / carb / fat % split."
                : "Using your manual calorie and gram macro targets."}{" "}
            List totals cover the full {days}-day period; budget compares to your spend for that same window.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Daily targets: ~{t.daily_calories} kcal · P{t.protein_g}g · C{t.carb_g}g · F{t.fat_g}g ·{" "}
            <span className="font-medium text-zinc-300">
              {targetSourceDetail === "auto" && "Auto"}
              {targetSourceDetail === "manual_percent" && "Manual %"}
              {targetSourceDetail === "manual_grams" && "Manual grams"}
            </span>
            {" · "}
            <span className="font-medium text-zinc-300">
              {planSummary.unitSystem === "imperial" ? "Imperial display" : "Metric display"}
            </span>
          </p>
        </header>

        <section
          className={`rounded-2xl border p-4 backdrop-blur-sm sm:p-6 ${
            planSummary.macroBandOk
              ? "border-lime-400/25 bg-lime-400/5"
              : "border-amber-400/35 bg-amber-500/10"
          }`}
        >
          <h2 className="font-display text-lg font-bold text-white">Plan interpretation</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-400">
            <li>
              <strong>Macros:</strong>{" "}
              {planSummary.macroBandOk
                ? "Daily averages are within about ±10% of your targets (primary goal met)."
                : "Daily macro averages fall outside the ±10% band — overall fit is capped until macros align."}
            </li>
            <li>
              <strong>Beneficial micros:</strong> vitamins, minerals, fiber — scored mainly on reaching ~90%+
              of reference; moderate overages are not heavily penalized.
            </li>
            <li>
              <strong>Limit nutrients:</strong> sugar, saturated fat, sodium — scored as caps; values over the
              daily reference hurt the limit score.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Plan variants</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {bundle.variants.map((v) => {
              const active = v.variant_id === selectedVariantId;
              const recommended = v.variant_id === bundle.recommended_variant_id;
              return (
                <button
                  key={v.variant_id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.variant_id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-lime-400/50 bg-lime-400/10 text-white shadow-[0_0_24px_-8px_rgba(163,230,53,0.35)]"
                      : "border-white/10 bg-zinc-950/50 text-zinc-300 hover:border-lime-400/25 hover:bg-zinc-900/80"
                  }`}
                >
                  <span className="font-semibold">{v.variant_label}</span>
                  {recommended && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        active ? "bg-lime-400/20 text-lime-200" : "bg-lime-400/15 text-lime-400"
                      }`}
                    >
                      Suggested
                    </span>
                  )}
                  {v.badges.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {v.badges.map((b) => (
                        <span
                          key={b}
                          className={`rounded-md px-2 py-0.5 text-[11px] ${
                            active ? "bg-white/10 text-zinc-200" : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          {b}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {plan.badges.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              This variant: {plan.badges.join(" · ")}
            </p>
          )}
        </section>

        <SummaryCards summary={planSummary} />

        {coverageRows.length > 0 && (
          <NutrientCoveragePanel
            rows={coverageRows}
            viewMode={coverageView}
            onViewModeChange={setCoverageView}
            days={days}
          />
        )}

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <h2 className="font-display text-xl font-bold text-white">Grocery list</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Grouped for shopping — quantities cover the full {days}-day period. Tap a substitute to update totals
            (rule-based, respects your diet filters).
          </p>
          <div className="mt-6 space-y-8">
            {groups.map((section) => (
              <div key={section.group}>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/80">{section.group}</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="py-2">Item</th>
                        <th className="py-2">Quantity</th>
                        <th className="py-2">Est. cost</th>
                        <th className="py-2">Protein</th>
                        <th className="py-2">Carbs</th>
                        <th className="py-2">Fat</th>
                        <th className="py-2">Shop</th>
                        <th className="py-2">Substitutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((food) => (
                        <tr key={food.name} className="border-t border-white/10 align-top">
                          <td className="py-3 font-medium text-zinc-100">{food.name}</td>
                          <td className="py-3 text-zinc-400">
                            {formatQuantityForDisplay(
                              food.name,
                              food.quantity_g,
                              input.unit_system ?? "metric",
                            )}
                          </td>
                          <td className="py-3 text-zinc-400">${food.cost.toFixed(2)}</td>
                          <td className="py-3 text-zinc-400">{food.protein} g</td>
                          <td className="py-3 text-zinc-400">{food.carbs} g</td>
                          <td className="py-3 text-zinc-400">{food.fat} g</td>
                          <td className="py-3">
                            {food.purchase_url ? (
                              <a
                                href={food.purchase_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline"
                                title={food.purchase_source_label ?? "Open search"}
                              >
                                {food.purchase_source_label ?? "Shop"}
                              </a>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {food.substitution_options && food.substitution_options.length > 0 ? (
                              <div className="flex max-w-xs flex-wrap gap-1.5">
                                {food.substitution_options.map((opt) => (
                                  <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => handleSwap(food.name, opt.name)}
                                    className="rounded-lg border border-white/10 bg-zinc-950/80 px-2 py-1 text-left text-xs text-zinc-300 transition hover:border-lime-400/40 hover:bg-lime-400/10"
                                    title={opt.reason}
                                  >
                                    {opt.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Totals and fit scores update when you substitute items. Overall fit weights macro match, micronutrient
            coverage, food quality, and staying within your budget cap.
          </p>
        </section>

        {plan.substitutions.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <h2 className="font-display text-xl font-bold text-white">More swap ideas</h2>
            <p className="mt-1 text-sm text-zinc-400">Rule-based alternatives if you want variety or savings.</p>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              {plan.substitutions.map((row) => (
                <li key={row.original} className="rounded-xl border border-white/8 bg-zinc-950/50 px-4 py-3">
                  <span className="font-medium text-white">{row.original}</span>
                  <span className="text-zinc-500"> — try </span>
                  {row.alternatives.map((a, i) => (
                    <span key={a.name}>
                      {i > 0 ? "; " : ""}
                      <button
                        type="button"
                        className="text-lime-400 underline-offset-2 hover:text-lime-300 hover:underline"
                        onClick={() => handleSwap(row.original, a.name)}
                      >
                        {a.name}
                      </button>
                      <span className="text-zinc-500">
                        {" "}
                        (
                        {a.reason === "cheaper"
                          ? "cheaper"
                          : a.reason === "similar_protein"
                            ? "similar protein"
                            : "similar carb"}
                        )
                      </span>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
