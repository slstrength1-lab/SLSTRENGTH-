import type { ReactNode } from "react";
import { DollarSign, CalendarClock, Award } from "lucide-react";
import type { Client, Sale, BusinessSummary, BillingStatus } from "@/lib/types";
import { Pill, ProgressBar } from "./primitives";
import { LineChart } from "./LineChart";
import { currency, shortDate } from "@/lib/format";

/**
 * Client Command Center — Business module (read-only, server-rendered).
 * Every figure comes from store.summarizeBusiness (live Sales + Client). No
 * fabricated values; empty/zero states render honestly.
 */

const billingStyle: Record<BillingStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  "Past Due": "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  Paused: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Cancelled: "bg-white/5 text-zinc-500 ring-white/10",
  Trial: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
};
const payStatusStyle: Record<string, string> = {
  Paid: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Pending: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Refunded: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  Failed: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
};

export function BusinessModule({
  client,
  summary,
  sales,
}: {
  client: Client;
  summary: BusinessSummary;
  sales: Sale[];
}) {
  const trend = summary.monthlyTrend.map((m) => ({ x: m.month, y: m.amount }));
  const hasTrend = summary.monthlyTrend.some((m) => m.amount > 0);
  const growth = summary.revenueGrowth;

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Lifetime revenue" value={currency(summary.lifetimeRevenue)} sub={`${summary.payments} payment${summary.payments === 1 ? "" : "s"}`} accent />
        <Tile label="Monthly revenue" value={currency(summary.monthlyRevenue)} sub="contracted" />
        <Tile label="Avg / month" value={currency(summary.avgMonthlyValue)} sub={`${summary.retentionMonths} mo active`} />
        <Tile
          label="Last payment"
          value={summary.lastPayment ? shortDate(summary.lastPayment) : "—"}
          sub={summary.lastPayment ? "received" : "none yet"}
        />
      </div>

      {/* Subscription */}
      <div className="rounded-xl bg-ink-850/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          <CalendarClock className="h-3.5 w-3.5" /> Subscription
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Plan" value={client.plan ? <Pill className="bg-white/5 text-zinc-300 ring-white/10">{client.plan}</Pill> : "—"} />
          <Field
            label="Billing"
            value={
              client.billingStatus ? (
                <Pill className={billingStyle[client.billingStatus]}>{client.billingStatus}</Pill>
              ) : (
                "—"
              )
            }
          />
          <Field label="Next payment" value={client.nextPaymentDate ? shortDate(client.nextPaymentDate) : "—"} />
          <Field label="Retention" value={`${summary.retentionMonths} mo`} />
        </div>
      </div>

      {/* Revenue section */}
      <div className="rounded-xl bg-ink-850/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            <DollarSign className="h-3.5 w-3.5" /> Revenue
          </span>
          <span className="text-xs text-zinc-500">
            This mo {currency(summary.revenueThisMonth)} · Last {currency(summary.revenueLastMonth)}
            {growth !== null && (
              <span className={`ml-2 font-semibold ${growth >= 0 ? "text-emerald-400" : "text-blood-400"}`}>
                {growth >= 0 ? "+" : ""}
                {Math.round(growth * 100)}%
              </span>
            )}
          </span>
        </div>
        {hasTrend ? (
          <LineChart series={{ points: trend, color: "#e11d2a" }} height={160} yLabel="Revenue ($)" format={(n) => `$${n}`} />
        ) : (
          <p className="py-6 text-center text-sm text-zinc-500">No payments in the last 6 months.</p>
        )}
      </div>

      {/* Client value + payment history */}
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <div className="rounded-xl bg-ink-850/60 p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            <Award className="h-3.5 w-3.5" /> Value score
          </div>
          <div className="text-3xl font-bold text-white">{summary.valueScore}</div>
          <div className="mt-1 text-[11px] text-zinc-600">tenure · revenue · compliance</div>
          <ProgressBar value={summary.valueScore} className="mt-3" />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Payment history
          </div>
          {sales.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-600">
                    <th className="py-1.5 pr-3 font-semibold">Date</th>
                    <th className="py-1.5 pr-3 font-semibold">Package</th>
                    <th className="py-1.5 pr-3 font-semibold">Type</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">Amount</th>
                    <th className="py-1.5 pr-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sales.slice(0, 8).map((s) => (
                    <tr key={s.id} className="text-zinc-300">
                      <td className="py-2 pr-3">{s.date ? shortDate(s.date) : "—"}</td>
                      <td className="py-2 pr-3">{s.package || "—"}</td>
                      <td className="py-2 pr-3 text-zinc-500">{s.paymentType}</td>
                      <td className="py-2 pr-3 text-right font-medium text-zinc-200">{currency(s.amount)}</td>
                      <td className="py-2 pr-3">
                        <Pill className={payStatusStyle[s.paymentStatus] ?? "bg-white/5 text-zinc-400 ring-white/10"}>
                          {s.paymentStatus}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-zinc-500">
              No payments recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg bg-ink-900/60 p-2.5 ${accent ? "ring-1 ring-inset ring-blood-500/30" : ""}`}>
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      {sub && <div className="text-[11px] text-zinc-600">{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-0.5 font-medium text-zinc-200">{value}</div>
    </div>
  );
}
