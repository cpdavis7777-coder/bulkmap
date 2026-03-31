import type { MacroCoverage } from "@/lib/types/bulkmap";

export function MacroBars({ macros }: { macros: MacroCoverage[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
      <h2 className="font-display text-xl font-bold text-white">Macro coverage</h2>
      <div className="mt-5 space-y-5">
        {macros.map((macro) => {
          const ratio = (macro.actual / macro.target) * 100;
          const width = Math.min(100, ratio);
          const status =
            ratio >= 97 && ratio <= 105 ? "Met" : ratio < 97 ? "Under target" : "Over target";
          const ok = ratio >= 90 && ratio <= 110;

          return (
            <div key={macro.key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-200">{macro.label}</span>
                <span className="text-xs text-zinc-500">
                  {macro.actual} / {macro.target} {macro.unit}{" "}
                  <span className={ok ? "text-lime-400" : "text-amber-400"}>({status})</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-500 via-lime-400 to-cyan-400"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
