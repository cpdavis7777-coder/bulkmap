import Link from "next/link";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { buttonVariants } from "@/lib/ui/button-variants";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-14 md:px-10">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 md:p-12">
          <p className="inline-block rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300">
            Budget x performance nutrition
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            BulkMap gives lifters an optimized grocery list for hitting macros and micros on budget.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-zinc-300 md:text-lg">
            Set your goal, constraints, and budget. BulkMap solves for exact foods, quantities, and
            cost so you can train hard without overspending.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding"
              className={cn(buttonVariants({ size: "lg" }), "text-sm font-semibold")}
            >
              Build My Grocery Plan
            </Link>
            <Link
              href="/results"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-sm font-semibold")}
            >
              View Demo Results
            </Link>
          </div>
        </section>

        <FeatureCards />
        <HowItWorks />
      </div>
    </main>
  );
}
