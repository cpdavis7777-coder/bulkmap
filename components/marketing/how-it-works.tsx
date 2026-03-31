const steps = [
  {
    title: "Set your goal",
    detail: "Choose bulk, cut, or maintain with your profile and activity inputs.",
  },
  {
    title: "Add constraints",
    detail: "Set budget, duration, diet style, and foods to avoid.",
  },
  {
    title: "Get your optimized list",
    detail: "Receive exact groceries, costs, nutrient coverage, and substitutes.",
  },
];

export function HowItWorks() {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8">
      <h2 className="text-2xl font-semibold text-white">How it works</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs font-semibold tracking-wide text-emerald-300">
              STEP {index + 1}
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-zinc-300">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
