import type { SavedPlan } from "@/lib/types/bulkmap";
import { ChevronRight } from "lucide-react";

export function RecentPlanCard({ plan }: { plan: SavedPlan }) {
  return (
    <article className="group rounded-xl border border-white/10 bg-zinc-900/40 p-5 transition hover:border-lime-400/25 hover:bg-zinc-900/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-white">{plan.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {plan.goal} · {plan.style} · {plan.createdAt}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-lime-300">
          {plan.coverageScore}% fit
        </span>
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        Est. weekly cost: <span className="font-semibold text-zinc-200">${plan.totalCost.toFixed(2)}</span>
      </p>
      <div className="mt-3 flex justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 opacity-0 transition group-hover:opacity-100">
          Open <ChevronRight className="size-3.5" />
        </span>
      </div>
    </article>
  );
}
