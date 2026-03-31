import type { MacroCoverage } from "@/lib/types/bulkmap";

export function MacroBars({ macros }: { macros: MacroCoverage[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Macro Coverage</h2>
      <div className="mt-5 space-y-4">
        {macros.map((macro) => {
          const ratio = (macro.actual / macro.target) * 100;
          const width = Math.min(100, ratio);
          const status =
            ratio >= 97 && ratio <= 105 ? "Met" : ratio < 97 ? "Under target" : "Over target";

          return (
            <div key={macro.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">{macro.label}</span>
                <span className="text-zinc-500">
                  {macro.actual} / {macro.target} {macro.unit} ({status})
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200">
                <div className="h-full rounded-full bg-zinc-900" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
