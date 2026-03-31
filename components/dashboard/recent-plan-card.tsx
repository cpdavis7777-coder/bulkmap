import type { SavedPlan } from "@/lib/types/bulkmap";

export function RecentPlanCard({ plan }: { plan: SavedPlan }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{plan.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {plan.goal} • {plan.style} • {plan.createdAt}
          </p>
        </div>
        <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-white">
          {plan.coverageScore}% covered
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-700">Estimated weekly cost: ${plan.totalCost.toFixed(2)}</p>
    </article>
  );
}
