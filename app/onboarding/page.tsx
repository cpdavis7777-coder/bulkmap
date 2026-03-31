import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-zinc-900 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Plan Setup</h1>
          <p className="mt-2 text-zinc-300">
            Tell BulkMap what you are targeting, what you avoid, and what you can spend.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </main>
  );
}
