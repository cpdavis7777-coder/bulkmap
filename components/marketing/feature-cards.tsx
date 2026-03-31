const features = [
  {
    title: "Solver-first nutrition planning",
    description:
      "BulkMap builds an optimized grocery list from your targets and constraints, not from rigid recipes.",
  },
  {
    title: "Budget-aware macro precision",
    description:
      "Hit protein, carbs, and fat goals while minimizing cost and keeping your weekly spend predictable.",
  },
  {
    title: "Micronutrient confidence",
    description:
      "Track vitamin and mineral coverage so your plan supports performance, recovery, and overall health.",
  },
];

export function FeatureCards() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{feature.description}</p>
        </article>
      ))}
    </section>
  );
}
