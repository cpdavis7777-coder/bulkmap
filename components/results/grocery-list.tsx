import type { GroceryGroup } from "@/lib/types/bulkmap";

export function GroceryList({ groups }: { groups: GroceryGroup[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Grouped Grocery List</h2>
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group.group}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{group.group}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-2">Food</th>
                    <th className="py-2">Quantity</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Why selected</th>
                    <th className="py-2">Top nutrients</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.name} className="border-t border-zinc-200 align-top">
                      <td className="py-3 font-medium text-zinc-900">{item.name}</td>
                      <td className="py-3 text-zinc-700">{item.quantity}</td>
                      <td className="py-3 text-zinc-700">${item.estimatedCost.toFixed(2)}</td>
                      <td className="py-3 text-zinc-700">{item.reason}</td>
                      <td className="py-3 text-zinc-700">{item.topNutrients.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
