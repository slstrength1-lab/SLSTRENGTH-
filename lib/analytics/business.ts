/**
 * Business snapshot analytics — the top-line money figures.
 * Pure functions over OwnerData + AnalyticsContext.
 */

import type { OwnerData, AnalyticsContext } from "./context";
import { monthKey, monthKeyOffset, monthLabelOffset } from "./dates";

/**
 * Monthly recurring revenue = sum of active clients' monthly rate. Per-session
 * clients are excluded: their `monthlyRate` holds a per-session price, not a
 * recurring charge, so counting it would inflate MRR. Their income still shows
 * up in booked revenue via their logged Sales.
 */
export function mrr(_data: OwnerData, ctx: AnalyticsContext): number {
  return ctx.active
    .filter((c) => c.plan !== "Per Session")
    .reduce((n, c) => n + c.monthlyRate, 0);
}

/** Annual recurring revenue. */
export function arr(data: OwnerData, ctx: AnalyticsContext): number {
  return mrr(data, ctx) * 12;
}

/** Paid revenue booked in the current calendar month. */
export function monthlyRevenue(_data: OwnerData, ctx: AnalyticsContext): number {
  return ctx.paid.filter((s) => monthKey(s.date) === ctx.thisKey).reduce((n, s) => n + s.amount, 0);
}

/** Paid revenue booked in the previous calendar month. */
export function lastMonthRevenue(_data: OwnerData, ctx: AnalyticsContext): number {
  return ctx.paid.filter((s) => monthKey(s.date) === ctx.lastKey).reduce((n, s) => n + s.amount, 0);
}

/** Month-over-month revenue growth as a fraction; null when no prior base. */
export function revenueGrowth(data: OwnerData, ctx: AnalyticsContext): number | null {
  const last = lastMonthRevenue(data, ctx);
  return last > 0 ? (monthlyRevenue(data, ctx) - last) / last : null;
}

/** Last 6 calendar months of Paid revenue (oldest → newest). */
export function revenueTrend(_data: OwnerData, ctx: AnalyticsContext): { month: string; amount: number }[] {
  const out: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const key = monthKeyOffset(ctx.nowISO, i);
    const amount = ctx.paid.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + s.amount, 0);
    out.push({ month: monthLabelOffset(ctx.nowISO, i), amount });
  }
  return out;
}

export interface RevenueGoal {
  goal: number;
  remaining: number;
  progress: number; // 0-100
}

/** Revenue-goal progress for the current month against the owner target. */
export function revenueGoalProgress(data: OwnerData, ctx: AnalyticsContext): RevenueGoal {
  const goal = ctx.config.revenueGoal;
  const rev = monthlyRevenue(data, ctx);
  return {
    goal,
    remaining: Math.max(0, goal - rev),
    progress: goal > 0 ? Math.min(100, Math.round((rev / goal) * 100)) : 0,
  };
}
