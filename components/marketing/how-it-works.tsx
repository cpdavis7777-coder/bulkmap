import { ListChecks, Settings2, ShoppingBasket } from "lucide-react";

const steps = [
  {
    icon: ListChecks,
    title: "Set your goal",
    detail: "Bulk, cut, or maintain with profile and activity inputs.",
  },
  {
    icon: Settings2,
    title: "Add constraints",
    detail: "Budget, duration, diet style, exclusions, and shopping preferences.",
  },
  {
    icon: ShoppingBasket,
    title: "Get your list",
    detail: "Exact groceries, costs, nutrient coverage, and substitutes.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-[#060708] p-8 shadow-[0_0_80px_-20px_rgba(34,211,238,0.12)] md:p-10">
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
      <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">How it works</h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Three steps from targets to a shoppable list — same flow whether you are dialing in a bulk or a cut.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="relative rounded-2xl border border-white/8 bg-black/40 p-5 transition hover:border-lime-400/20"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-lime-400/15 text-lime-300">
                  <Icon className="size-4" strokeWidth={2.25} aria-hidden />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-400/90">Step {index + 1}</p>
              </div>
              <h3 className="font-display text-base font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
