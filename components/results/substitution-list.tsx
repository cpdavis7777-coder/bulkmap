import type { Substitution } from "@/lib/types/bulkmap";

function reasonLabel(reason: Substitution["alternatives"][number]["reason"]) {
  switch (reason) {
    case "cheaper":
      return "Cheaper";
    case "similar_macros":
      return "Similar macros";
    case "similar_micros":
      return "Similar micros";
    case "diet_match":
      return "Diet match";
    default:
      return reason;
  }
}

export function SubstitutionList({ items }: { items: Substitution[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Substitutions</h2>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <article key={item.original} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="font-medium text-zinc-900">Replace {item.original} with:</h3>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
              {item.alternatives.map((alt) => (
                <li key={`${item.original}-${alt.name}`} className="flex items-center justify-between">
                  <span>
                    {alt.name} - {reasonLabel(alt.reason)}
                  </span>
                  <span className={alt.costDelta <= 0 ? "text-emerald-600" : "text-zinc-500"}>
                    {alt.costDelta <= 0 ? "-" : "+"}${Math.abs(alt.costDelta).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
