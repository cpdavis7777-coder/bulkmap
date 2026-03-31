import Link from "next/link";
import { Activity, ChevronRight, Cpu, Sparkles } from "lucide-react";
import { FeatureCards } from "@/components/marketing/feature-cards";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { buttonVariants } from "@/lib/ui/button-variants";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080c] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.35_0.15_145/0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,oklch(0.25_0.08_215/0.2),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 md:gap-20 md:px-10 md:py-20">
        <section className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-lime-300">
              <Sparkles className="size-3.5 text-lime-400" aria-hidden />
              Performance nutrition
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline">Macro precision · Budget capped</span>
          </div>

          <h1 className="font-display mt-8 max-w-4xl text-[2.35rem] font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl md:leading-[1.02]">
            Fuel training with{" "}
            <span className="bg-gradient-to-r from-lime-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
              grocery lists
            </span>{" "}
            built for your macros.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
            BulkMap solves for real foods, quantities, and cost — so you hit protein, carbs, fat, and key micros
            without guessing at the store.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/onboarding"
              className={cn(
                "group",
                buttonVariants({ size: "lg" }),
                "shadow-lg shadow-lime-500/20 transition hover:shadow-xl hover:shadow-lime-500/25",
              )}
            >
              Build my plan
              <ChevronRight className="size-4 opacity-90 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/results"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/15 bg-white/5 text-zinc-100 backdrop-blur-md hover:border-cyan-400/35 hover:bg-white/10",
              )}
            >
              View demo results
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 border-t border-white/10 pt-10 md:grid-cols-4">
            {[
              { label: "Macro-first solver", sub: "Targets, not templates" },
              { label: "Spend ceiling", sub: "Weekly budget as a cap" },
              { label: "Micro coverage", sub: "DV-style references" },
              { label: "Swap-friendly", sub: "Rule-based substitutes" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[13px] font-semibold text-zinc-200">{item.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3 text-zinc-600">
          <Activity className="size-5 text-lime-500/80" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Why BulkMap</span>
        </div>

        <FeatureCards />

        <div className="flex items-center gap-3 text-zinc-600">
          <Cpu className="size-5 text-cyan-400/80" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">How it runs</span>
        </div>

        <HowItWorks />
      </div>
    </main>
  );
}
