/**
 * Revenue-depth analytics — lifetime value, ARPC, conversion, payment schedules,
 * and the per-client business summary (consumed by the Client Command Center).
 * Pure functions; the per-client `summarizeBusiness` is framework-agnostic so a
 * future AI advisor / HPOS can reuse it unchanged.
 */

import type { Client, Sale, BusinessSummary, UpcomingPayment } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { monthKey, monthsBetween, monthKeyOffset, monthLabelOffset, dayDiff } from "./dates";

/** Client Lifetime Value — average lifetime revenue across paying clients. */
export function clientLifetimeValue(data: OwnerData): number {
  const paying = data.clients.filter((c) => c.lifetimeRevenue > 0);
  if (!paying.length) return 0;
  return Math.round(paying.reduce((n, c) => n + c.lifetimeRevenue, 0) / paying.length);
}

/** Average Revenue Per Client — lifetime revenue booked / paying clients. */
export function avgRevenuePerClient(data: OwnerData): number {
  const paying = data.clients.filter((c) => c.lifetimeRevenue > 0);
  if (!paying.length) return 0;
  const total = paying.reduce((n, c) => n + c.lifetimeRevenue, 0);
  return Math.round(total / paying.length);
}

/** Lead→client conversion: Closed Won / total leads (null when no leads). */
export function conversionRate(data: OwnerData): number | null {
  if (!data.leads.length) return null;
  const won = data.leads.filter((l) => l.stage === "Closed Won").length;
  return won / data.leads.length;
}

/** Open leads created this month (proxy for "new leads" — no created field, use open stages). */
export function openLeadCount(data: OwnerData): number {
  return data.leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Nurture").length;
}

export function recentPayments(_data: OwnerData, ctx: AnalyticsContext, limit = 6): Sale[] {
  return [...ctx.paid].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

export function upcomingPayments(_data: OwnerData, ctx: AnalyticsContext, limit = 6): UpcomingPayment[] {
  return ctx.active
    .filter((c) => c.nextPaymentDate && (dayDiff(ctx.nowISO, c.nextPaymentDate) ?? -1) >= 0)
    .sort((a, b) => (a.nextPaymentDate! < b.nextPaymentDate! ? -1 : 1))
    .slice(0, limit)
    .map((c) => ({
      clientId: c.id,
      name: c.name,
      initials: c.avatarInitials,
      date: c.nextPaymentDate!,
      amount: c.monthlyRate,
    }));
}

/* ------------------------------------------------------------------ */
/* Per-client business summary (Client Command Center)                */
/* ------------------------------------------------------------------ */

/**
 * Compute a client's Business summary from their Sales rows + Client fields.
 * Pure — no fetching, no fabrication. Only Paid sales count toward revenue.
 * (Relocated verbatim from store.ts as part of the analytics-layer refactor.)
 */
export function summarizeBusiness(
  client: Client,
  sales: Sale[],
  nowISO: string = new Date().toISOString().slice(0, 10),
): BusinessSummary {
  const paid = sales.filter((s) => s.paymentStatus === "Paid");
  const lifetimeRevenue = paid.reduce((sum, s) => sum + s.amount, 0);
  const payments = paid.length;
  const lastPayment = paid.reduce((latest, s) => (s.date > latest ? s.date : latest), "");

  const endRef = client.cancelledDate || nowISO;
  const retentionMonths = client.startDate ? monthsBetween(client.startDate, endRef) : 0;
  const clientAgeMonths = client.startDate ? monthsBetween(client.startDate, nowISO) : 0;
  const avgMonthlyValue = retentionMonths > 0 ? lifetimeRevenue / retentionMonths : lifetimeRevenue;

  const thisKey = monthKey(nowISO);
  const lastKey = monthKeyOffset(nowISO, 1);
  const revenueThisMonth = paid.filter((s) => monthKey(s.date) === thisKey).reduce((n, s) => n + s.amount, 0);
  const revenueLastMonth = paid.filter((s) => monthKey(s.date) === lastKey).reduce((n, s) => n + s.amount, 0);
  const revenueGrowth = revenueLastMonth > 0 ? (revenueThisMonth - revenueLastMonth) / revenueLastMonth : null;

  const monthlyTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const key = monthKeyOffset(nowISO, i);
    const amount = paid.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + s.amount, 0);
    monthlyTrend.push({ month: monthLabelOffset(nowISO, i), amount });
  }

  const tenureScore = Math.min(retentionMonths / 12, 1);
  const revenueScore = client.monthlyRate > 0 ? Math.min(lifetimeRevenue / (client.monthlyRate * 12), 1) : 0;
  const complianceScore = (client.compliance ?? 0) / 100;
  const valueScore = Math.round(100 * (0.4 * tenureScore + 0.4 * revenueScore + 0.2 * complianceScore));

  return {
    lifetimeRevenue,
    monthlyRevenue: client.monthlyRate,
    payments,
    avgMonthlyValue: Math.round(avgMonthlyValue),
    lastPayment,
    revenueThisMonth,
    revenueLastMonth,
    revenueGrowth,
    monthlyTrend,
    retentionMonths,
    clientAgeMonths,
    valueScore,
  };
}
