import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#07080c] px-6 py-12 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,oklch(0.3_0.12_145/0.12),transparent)]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400/90">Onboarding</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Plan setup
          </h1>
          <p className="mt-3 max-w-xl text-zinc-400">
            Targets, diet rules, budget, and exclusions — same path every time.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </main>
  );
}
