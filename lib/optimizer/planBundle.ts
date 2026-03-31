import { generatePlan, type GeneratePlanMode, type PlannerDebugSnapshot } from "@/lib/optimizer/generatePlan";
import {
  assignCrossVariantBadges,
  pickRecommendedVariant,
  scorePlan,
} from "@/lib/optimizer/scoring";
import type { PlanBundleOutput, PlanInput, PlanVariantResult, PlannerDiagnostics } from "@/lib/types/bulkmap";
import type { PlanStrategy } from "@/lib/optimizer/sortStrategies";

const ORDER: PlanStrategy[] = ["budget", "quality", "variety"];

const LABELS: Record<PlanStrategy, string> = {
  budget: "Best Budget",
  quality: "Best Quality",
  variety: "Best Variety",
};

function buildDiagnostics(
  variants: PlanVariantResult[],
  snapshots: PlannerDebugSnapshot[],
): PlannerDiagnostics["variants"] {
  return variants.map((v, i) => {
    const s = snapshots[i];
    return {
      variant_id: v.variant_id,
      strategy: s.strategy,
      macro_fit: v.scores.macro_fit,
      total_cost: v.total_cost,
      prioritize_macro_caps: s.prioritizeMacroFit,
      period_protein_target_g: s.periodProteinTargetG,
      shortlisted: s.shortlisted,
    };
  });
}

function buildPlanBundleInner(
  input: PlanInput,
  mode: GeneratePlanMode,
  includeDiagnostics: boolean,
): { bundle: PlanBundleOutput; snapshots: PlannerDebugSnapshot[] } {
  const snapshots: PlannerDebugSnapshot[] = [];
  const variants: PlanVariantResult[] = [];

  for (const id of ORDER) {
    const plan = generatePlan(
      input,
      id,
      mode,
      includeDiagnostics
        ? (snap) => {
            snapshots.push(snap);
          }
        : undefined,
    );
    const scores = scorePlan(plan, input);
    variants.push({
      ...plan,
      variant_id: id,
      variant_label: LABELS[id],
      badges: [],
      scores,
    });
  }

  assignCrossVariantBadges(variants);

  const bundle: PlanBundleOutput = {
    variants,
    recommended_variant_id: pickRecommendedVariant(input),
  };

  return { bundle, snapshots };
}

function logPlannerDebug(generation: "default" | "feasibility", snapshots: PlannerDebugSnapshot[]) {
  if (process.env.BULKMAP_PLANNER_DEBUG !== "1") return;
  console.debug(
    `[BulkMap planner] generation=${generation}`,
    snapshots.map((s) => ({
      strategy: s.strategy,
      protein_shortlist: s.shortlisted.protein.slice(0, 8),
      n_protein: s.shortlisted.protein.length,
      prioritize_caps: s.prioritizeMacroFit,
      period_protein_g: s.periodProteinTargetG,
    })),
  );
}

export type GeneratePlanBundleOptions = {
  /** When true, response includes `planner_diagnostics` (shortlists, caps, pass used). */
  includeDiagnostics?: boolean;
};

export function generatePlanBundle(
  input: PlanInput,
  options: GeneratePlanBundleOptions = {},
): PlanBundleOutput {
  const includeDiag = options.includeDiagnostics ?? false;

  try {
    const { bundle, snapshots } = buildPlanBundleInner(input, "default", includeDiag);
    logPlannerDebug("default", snapshots);
    if (includeDiag && snapshots.length === ORDER.length) {
      return {
        ...bundle,
        planner_diagnostics: {
          generation_mode: "default",
          default_pass_failed: false,
          variants: buildDiagnostics(bundle.variants, snapshots),
        },
      };
    }
    return bundle;
  } catch (firstError) {
    const firstMsg = firstError instanceof Error ? firstError.message : String(firstError);
    if (process.env.BULKMAP_PLANNER_DEBUG === "1") {
      console.debug("[BulkMap planner] default pass failed:", firstMsg);
    }
    try {
      const { bundle, snapshots } = buildPlanBundleInner(input, "feasibility", includeDiag);
      logPlannerDebug("feasibility", snapshots);
      if (includeDiag && snapshots.length === ORDER.length) {
        return {
          ...bundle,
          planner_diagnostics: {
            generation_mode: "feasibility",
            default_pass_failed: true,
            first_error_message: firstMsg,
            variants: buildDiagnostics(bundle.variants, snapshots),
          },
        };
      }
      return bundle;
    } catch (secondError) {
      const secondMsg = secondError instanceof Error ? secondError.message : "Plan generation failed after feasibility retry.";
      throw new Error(`${secondMsg} Initial failure: ${firstMsg}`);
    }
  }
}
