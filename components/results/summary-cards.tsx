import type { PlanSummary, TargetSourceDetail } from "@/lib/types/bulkmap";
import { Activity, Coins, Gauge, Leaf, Shield, Target } from "lucide-react";

function describeTargets(src: TargetSourceDetail): string {
  if (src === "auto") return "Auto (profile)";
  if (src === "manual_percent") return "Manual %";
  return "Manual grams";
}

const iconFor = (label: string) => {
  if (label.includes("Budget")) return Coins;
  if (label.includes("cost")) return Coins;
  if (label.includes("calories")) return Activity;
  if (label.includes("Macro fit")) return Gauge;
  if (label.includes("Beneficial")) return Leaf;
  if (label.includes("Limit")) return Shield;
  if (label.includes("Overall")) return Target;
  if (label.includes("Targets")) return Target;
  return Activity;
};

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
      {items.map((item) => {
        const Icon = iconFor(item.label);
        return (
          <article
            key={item.label}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-4 shadow-sm transition hover:border-lime-400/20 hover:shadow-[0_12px_40px_-20px_rgba(163,230,53,0.2)]"
          >
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Icon className="size-3.5 text-lime-500/70" strokeWidth={2} aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
            </div>
            <p className="font-display text-lg font-bold leading-snug text-white">{item.value}</p>
          </article>
        );
      })}
    </section>
  );
}
