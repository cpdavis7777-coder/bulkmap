import type { MicronutrientCoverage } from "@/lib/types/bulkmap";

export function MicronutrientGrid({ micros }: { micros: MicronutrientCoverage[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Micronutrient Coverage</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {micros.map((micro) => {
          const pct = (micro.actual / micro.target) * 100;
          const badge =
            pct >= 100 ? "Met" : pct >= 90 ? "Slightly under" : "Needs attention";

          return (
            <article key={micro.nutrient} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-900">{micro.nutrient}</h3>
                <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-white">{badge}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {micro.actual} / {micro.target} {micro.unit}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
