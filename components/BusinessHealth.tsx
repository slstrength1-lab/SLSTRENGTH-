import Link from "next/link";
import { DollarSign, LineChart as LineIcon, Trophy, Clock } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { Card, SectionTitle, Ring, ProgressBar, Avatar, EmptyState } from "./primitives";
import { LineChart } from "./LineChart";
import { currency, shortDate } from "@/lib/format";

/**
 * Business Health — trend charts, compliance rings, revenue-vs-goal, top
 * clients, and recent/upcoming payments. Reuses LineChart / Ring / ProgressBar.
 * Health metrics with no data yet (workouts, nutrition) render an honest dash.
 */
export function BusinessHealth({ summary }: { summary: OwnerSummary }) {
  const s = summary;
  const revTrend = s.revenueTrend.map((m) => ({ x: m.month, y: m.amount }));
  const growthTrend = s.clientGrowthTrend.map((m) => ({ x: m.month, y: m.count }));
  const hasRev = s.revenueTrend.some((m) => m.amount > 0);

  return (
    <div className="space-y-4">
      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle right={<span className="text-xs text-zinc-500">last 6 months</span>}>
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blood-500" /> Revenue trend
            </span>
          </SectionTitle>
          {hasRev ? (
            <LineChart series={{ points: revTrend, color: "#e11d2a" }} height={180} yLabel="Revenue ($)" format={(n) => `$${n}`} />
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">No payments in the last 6 months.</p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle right={<span className="text-xs text-zinc-500">active clients</span>}>
            <span className="flex items-center gap-2">
              <LineIcon className="h-4 w-4 text-blood-500" /> Client growth
            </span>
          </SectionTitle>
          <LineChart series={{ points: growthTrend, color: "#38bdf8" }} height={180} yLabel="Clients" />
        </Card>
      </div>

      {/* Rings + revenue vs goal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="grid place-items-center p-5">
          <Ring value={s.portfolioCompliance} label={`${s.portfolioCompliance}%`} sublabel="Check-ins" />
        </Card>
        <Card className="grid place-items-center p-5">
          <Ring
            value={s.workoutCompletion ?? 0}
            label={s.workoutCompletion === null ? "—" : `${s.workoutCompletion}%`}
            sublabel="Workouts"
            color="#f59e0b"
          />
        </Card>
        <Card className="grid place-items-center p-5">
          <Ring
            value={s.nutritionCompliance ?? 0}
            label={s.nutritionCompliance === null ? "—" : `${s.nutritionCompliance}%`}
            sublabel="Nutrition"
            color="#10b981"
          />
        </Card>
        <Card className="flex flex-col justify-center p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Revenue vs goal</div>
          <div className="mb-2 text-xl font-bold text-white">
            {currency(s.monthlyRevenue)} <span className="text-sm font-medium text-zinc-500">/ {currency(s.revenueGoal)}</span>
          </div>
          <ProgressBar value={s.goalProgress} />
          <div className="mt-1.5 text-[11px] text-zinc-600">{s.goalProgress}% · {currency(s.revenueRemaining)} to go</div>
        </Card>
      </div>

      {/* Top clients + payments */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" /> Top clients
            </span>
          </SectionTitle>
          {s.topClients.length ? (
            <ul className="space-y-2">
              {s.topClients.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-3 rounded-xl bg-ink-850/60 p-2.5 transition-colors hover:bg-white/5">
                    <span className="w-4 text-center text-xs font-bold text-zinc-600">{i + 1}</span>
                    <Avatar initials={c.initials} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{c.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-zinc-200">{currency(c.lifetimeRevenue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No revenue recorded yet." />
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle right={<span className="text-xs text-zinc-500">recent</span>}>Recent payments</SectionTitle>
          {s.recentPayments.length ? (
            <ul className="space-y-2">
              {s.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-ink-850/60 p-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{p.package || "Payment"}</span>
                  <span className="shrink-0 text-zinc-500">{p.date ? shortDate(p.date) : "—"}</span>
                  <span className="ml-3 shrink-0 font-semibold text-emerald-400">{currency(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No payments yet." />
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle right={<Clock className="h-3.5 w-3.5 text-zinc-500" />}>Upcoming payments</SectionTitle>
          {s.upcomingPayments.length ? (
            <ul className="space-y-2">
              {s.upcomingPayments.map((p) => (
                <li key={p.clientId} className="flex items-center gap-3 rounded-xl bg-ink-850/60 p-2.5 text-sm">
                  <Avatar initials={p.initials} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{p.name}</span>
                  <span className="shrink-0 text-zinc-500">{shortDate(p.date)}</span>
                  <span className="ml-2 shrink-0 font-semibold text-zinc-200">{currency(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scheduled payments." hint="Set Next Payment dates on clients to populate this." />
          )}
        </Card>
      </div>
    </div>
  );
}
