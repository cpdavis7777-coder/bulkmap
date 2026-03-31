import type { PlanSummary, TargetSourceDetail } from "@/lib/types/bulkmap";

function describeTargets(src: TargetSourceDetail): string {
  if (src === "auto") return "Auto (profile)";
  if (src === "manual_percent") return "Manual %";
  return "Manual grams";
}

export function SummaryCards({ summary }: { summary: PlanSummary }) {
  const items = [
    { label: "Budget (period)", value: `$${summary.budget.toFixed(0)}` },
    { label: "Estimated cost", value: `$${summary.estimatedCost.toFixed(2)}` },
    { label: "Period calories", value: `${Math.round(summary.caloriesPerDay * summary.durationDays)} kcal` },
    {
      label: "Macro fit (±10%)",
      value: `${summary.macroFitScore}%${summary.macroBandOk ? "" : " ⚠"}`,
    },
    { label: "Beneficial micros", value: `${summary.beneficialMicroFitScore}%` },
    { label: "Limit nutrients", value: `${summary.limitComplianceScore}%` },
    { label: "Overall plan fit", value: `${summary.overallFitScore}%` },
    { label: "Targets", value: describeTargets(summary.targetSourceDetail) },
    { label: "Units", value: summary.unitSystem === "imperial" ? "Imperial" : "Metric" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <article key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-zinc-950">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
