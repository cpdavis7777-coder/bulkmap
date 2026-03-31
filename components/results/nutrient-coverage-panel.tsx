"use client";

import type { NutrientCoverageRow } from "@/lib/types/nutrition";
import { sanitizeNutrientCoverageRows } from "@/lib/nutrition/computePlanCoverage";

export type CoverageViewMode = "daily" | "period";

const MACRO_KEYS = new Set(["calories", "protein", "carbs", "fat"]);
const HEALTH_KEYS = new Set(["fiber_g", "sugar_g", "sodium_mg", "sat_fat_g"]);

function isVitaminKey(key: string) {
  return key.startsWith("vit_") || key === "folate_mcg_dfe";
}

function partitionRows(rows: NutrientCoverageRow[]) {
  const macro: NutrientCoverageRow[] = [];
  const health: NutrientCoverageRow[] = [];
  const vitamins: NutrientCoverageRow[] = [];
  const minerals: NutrientCoverageRow[] = [];
  for (const r of rows) {
    if (MACRO_KEYS.has(r.key)) macro.push(r);
    else if (HEALTH_KEYS.has(r.key)) health.push(r);
    else if (isVitaminKey(r.key)) vitamins.push(r);
    else minerals.push(r);
  }
  return { macro, health, vitamins, minerals };
}

function statusLabel(s: NutrientCoverageRow["status"], isCap?: boolean) {
  if (s === "ok") return "On target";
  if (s === "under") return "Under target";
  if (s === "above") return "Above target";
  if (s === "over") return isCap ? "Over limit" : "Above target";
  return "—";
}

function barTone(status: NutrientCoverageRow["status"]) {
  if (status === "under") return "bg-amber-500";
  if (status === "ok") return "bg-lime-500";
  if (status === "above") return "bg-cyan-500";
  return "bg-rose-500";
}

function fmtNum(n: number | undefined | null, frac = 1): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: frac });
}

function NutrientBar({
  row,
  mode,
  days,
  compact,
}: {
  row: NutrientCoverageRow;
  mode: CoverageViewMode;
  days: number;
  compact?: boolean;
}) {
  const d = Math.max(1, days);
  const targetDaily = row.target_daily;
  const target = mode === "daily" ? targetDaily : targetDaily * d;
  const actual = mode === "daily" ? row.actual_daily_avg : row.actual_period;
  const pct = Number.isFinite(row.pct_of_daily_target) ? row.pct_of_daily_target : 0;
  const width = Math.min(100, (pct / 120) * 100);

  return (
    <div className={compact ? "" : "space-y-1.5"}>
      <div className="flex items-start justify-between gap-2 text-xs sm:text-sm">
        <span className="font-medium text-zinc-200">{row.label}</span>
        <span className="shrink-0 text-right text-zinc-500">
          <span className="tabular-nums text-zinc-100">{fmtNum(actual)}</span>
          <span className="text-zinc-400"> / </span>
          <span className="tabular-nums">{fmtNum(target)}</span>
          <span className="ml-1 text-zinc-400">{row.unit}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/5">
        <div
          className={`h-full rounded-full transition-[width] ${barTone(row.status)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-zinc-500">
        <span>{fmtNum(pct, 1)}% of daily target</span>
        <span
          className={
            row.status === "ok"
              ? "text-lime-400"
              : row.status === "under"
                ? "text-amber-400"
                : row.status === "above"
                  ? "text-cyan-400"
                  : "text-rose-400"
          }
        >
          {statusLabel(row.status, row.is_cap)}
        </span>
      </div>
    </div>
  );
}

export function NutrientCoveragePanel({
  rows,
  viewMode,
  onViewModeChange,
  days,
}: {
  rows: NutrientCoverageRow[];
  viewMode: CoverageViewMode;
  onViewModeChange: (mode: CoverageViewMode) => void;
  days: number;
}) {
  const safeRows = sanitizeNutrientCoverageRows(rows);
  const { macro, health, vitamins, minerals } = partitionRows(safeRows);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Nutrient coverage</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Aggregate plan vs FDA Daily Value–style references (adult-oriented MVP). Macros use your plan targets;
            micronutrients use standard reference daily amounts scaled to your calorie level where noted.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-white/10 bg-zinc-950/80 p-1 text-sm">
          <button
            type="button"
            onClick={() => onViewModeChange("daily")}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              viewMode === "daily"
                ? "bg-lime-400/15 text-lime-200 shadow-inner"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Average / day
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("period")}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              viewMode === "period"
                ? "bg-lime-400/15 text-lime-200 shadow-inner"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Full {days}-day plan
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-10">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/75">Macronutrients</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {macro.map((row) => (
              <NutrientBar key={row.key} row={row} mode={viewMode} days={days} />
            ))}
          </div>
        </div>

        {health.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/75">
              Fiber &amp; limits
            </h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {health.map((row) => (
                <NutrientBar key={row.key} row={row} mode={viewMode} days={days} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/75">Vitamins</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vitamins.map((row) => (
              <div key={row.key} className="rounded-xl border border-white/8 bg-zinc-950/50 p-4">
                <NutrientBar row={row} mode={viewMode} days={days} compact />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/75">Minerals</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {minerals.map((row) => (
              <div key={row.key} className="rounded-xl border border-white/8 bg-zinc-950/50 p-4">
                <NutrientBar row={row} mode={viewMode} days={days} compact />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Exact percentages</h3>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 pr-4 font-medium">Nutrient</th>
              <th className="py-2 pr-4 font-medium">Target / day</th>
              <th className="py-2 pr-4 font-medium">
                {viewMode === "daily" ? "Avg / day" : `Period (${days} d)`}
              </th>
              <th className="py-2 pr-4 font-medium">% of target</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => {
              const actual = viewMode === "daily" ? row.actual_daily_avg : row.actual_period;
              return (
                <tr key={row.key} className="border-b border-white/5">
                  <td className="py-2 pr-4 font-medium text-zinc-200">{row.label}</td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-500">
                    {fmtNum(row.target_daily, 2)} {row.unit}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-300">
                    {fmtNum(actual, 2)} {row.unit}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-300">{fmtNum(row.pct_of_daily_target, 1)}%</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.status === "ok"
                          ? "bg-lime-400/15 text-lime-300"
                          : row.status === "under"
                            ? "bg-amber-500/15 text-amber-300"
                            : row.status === "above"
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {statusLabel(row.status, row.is_cap)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
