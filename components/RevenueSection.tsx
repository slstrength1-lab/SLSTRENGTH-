import Link from "next/link";
import { DollarSign, Trophy, Clock } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { Card, SectionTitle, Avatar, EmptyState } from "./primitives";
import { LineChart } from "./LineChart";
import { currency, shortDate } from "@/lib/format";

/**
 * Revenue — depth metrics (MRR/ARR/CLV/ARPC/churn), the 6-month trend, top
 * clients, and recent/upcoming payments. All from lib/analytics.
 */
function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-ink-900/60 p-2.5">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-zinc-600">{sub}</div>}
    </div>
  );
}

export function RevenueSection({ summary: s }: { summary: OwnerSummary }) {
  const trend = s.revenueTrend.map((m) => ({ x: m.month, y: m.amount }));
  const hasTrend = s.revenueTrend.some((m) => m.amount > 0);
  const churn = s.churnRate === null ? "0%" : `${Math.round(s.churnRate * 100)}%`;

  return (
    <Card className="p-5">
      <SectionTitle>
        <span className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blood-500" /> Revenue
        </span>
      </SectionTitle>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="This month" value={currency(s.monthlyRevenue)} sub="paid" />
        <Metric label="MRR" value={currency(s.mrr)} />
        <Metric label="ARR" value={currency(s.arr)} />
        <Metric label="Lifetime value" value={currency(s.clientLifetimeValue)} sub="per client" />
        <Metric label="Avg / client" value={currency(s.avgRevenuePerClient)} sub="ARPC" />
        <Metric label="Churn" value={churn} sub="this month" />
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Revenue trend · 6 months</div>
        {hasTrend ? (
          <LineChart series={{ points: trend, color: "#e11d2a" }} height={170} yLabel="Revenue ($)" format={(n) => `$${n}`} />
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">No payments in the last 6 months.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Top clients */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Top clients
          </div>
          {s.topClients.length ? (
            <ul className="space-y-1.5">
              {s.topClients.map((c, i) => (
                <li key={c.id}>
                  <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-2.5 rounded-lg bg-ink-850/60 p-2 transition-colors hover:bg-white/5">
                    <span className="w-3 text-center text-xs font-bold text-zinc-600">{i + 1}</span>
                    <Avatar initials={c.initials} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{c.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-zinc-200">{currency(c.lifetimeRevenue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No revenue yet." />
          )}
        </div>

        {/* Recent payments */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Recent payments</div>
          {s.recentPayments.length ? (
            <ul className="space-y-1.5">
              {s.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-ink-850/60 p-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{p.package || "Payment"}</span>
                  <span className="shrink-0 text-zinc-500">{p.date ? shortDate(p.date) : "—"}</span>
                  <span className="ml-2 shrink-0 font-semibold text-emerald-400">{currency(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No payments yet." />
          )}
        </div>

        {/* Upcoming payments */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            <Clock className="h-3.5 w-3.5" /> Upcoming payments
          </div>
          {s.upcomingPayments.length ? (
            <ul className="space-y-1.5">
              {s.upcomingPayments.map((p) => (
                <li key={p.clientId} className="flex items-center gap-2.5 rounded-lg bg-ink-850/60 p-2 text-sm">
                  <Avatar initials={p.initials} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{p.name}</span>
                  <span className="shrink-0 text-zinc-500">{shortDate(p.date)}</span>
                  <span className="ml-1.5 shrink-0 font-semibold text-zinc-200">{currency(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scheduled payments." />
          )}
        </div>
      </div>
    </Card>
  );
}
