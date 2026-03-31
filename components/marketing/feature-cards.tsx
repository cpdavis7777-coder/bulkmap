import { BarChart3, PiggyBank, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Solver-first planning",
    description:
      "An optimized grocery list from your targets and constraints — not rigid meal plans you will not follow.",
  },
  {
    icon: PiggyBank,
    title: "Budget-aware macros",
    description:
      "Hit protein, carbs, and fat while keeping weekly spend predictable and capped.",
  },
  {
    icon: ShieldCheck,
    title: "Micro coverage",
    description:
      "Track vitamins and minerals against reference daily values so the plan supports recovery and health.",
  },
];

export function FeatureCards() {
  return (
    <section className="grid gap-5 md:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <article
            key={feature.title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition duration-300 hover:border-lime-400/25 hover:shadow-[0_20px_50px_-24px_rgba(163,230,53,0.35)]"
          >
            <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-white/5 p-2.5 text-lime-400 transition group-hover:border-lime-400/30 group-hover:text-lime-300">
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <h3 className="font-display text-lg font-bold tracking-tight text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
          </article>
        );
      })}
    </section>
  );
}
