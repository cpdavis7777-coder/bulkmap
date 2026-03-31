import Link from "next/link";
import { RecentPlanCard } from "@/components/dashboard/recent-plan-card";
import { buttonVariants } from "@/lib/ui/button-variants";
import { savedPlans } from "@/lib/data/demo-results";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your Dashboard</h1>
            <p className="mt-1 text-zinc-600">Saved plans, preferences, and quick actions.</p>
          </div>
          <Link
            href="/onboarding"
            className={cn(buttonVariants({ size: "lg" }), "text-sm font-semibold")}
          >
            Create New Plan
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Saved Plans</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{savedPlans.length}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Avg Coverage</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {Math.round(
                savedPlans.reduce((sum, plan) => sum + plan.coverageScore, 0) / savedPlans.length,
              )}
              %
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Latest Plan Cost</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">${savedPlans[0].totalCost.toFixed(2)}</p>
          </article>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-900">Recent Plans</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {savedPlans.map((plan) => (
              <RecentPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
