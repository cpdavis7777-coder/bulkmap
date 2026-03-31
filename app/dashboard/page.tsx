import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";
import { RecentPlanCard } from "@/components/dashboard/recent-plan-card";
import { buttonVariants } from "@/lib/ui/button-variants";
import { savedPlans } from "@/lib/data/demo-results";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#07080c] px-6 py-10 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,oklch(0.25_0.08_215/0.12),transparent)]" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm md:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/10 text-lime-400">
              <LayoutDashboard className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
              <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Your workspace
              </h1>
              <p className="mt-1 text-zinc-400">Saved plans and quick actions.</p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex items-center gap-2 shadow-lg shadow-lime-500/15",
            )}
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Create new plan
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Saved plans</p>
            <p className="font-display mt-2 text-3xl font-bold text-white">{savedPlans.length}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Avg coverage</p>
            <p className="font-display mt-2 text-3xl font-bold text-lime-300">
              {Math.round(
                savedPlans.reduce((sum, plan) => sum + plan.coverageScore, 0) / savedPlans.length,
              )}
              %
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Latest plan cost</p>
            <p className="font-display mt-2 text-3xl font-bold text-cyan-300">
              ${savedPlans[0].totalCost.toFixed(2)}
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">Recent plans</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {savedPlans.map((plan) => (
              <RecentPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
