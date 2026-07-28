/**
 * Client-base analytics — counts, capacity, growth, lifetime.
 * Pure functions over OwnerData + AnalyticsContext.
 */

import type { Client } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { monthKey, monthsBetween, monthKeyOffset, monthLabelOffset } from "./dates";

export interface ClientCounts {
  active: number;
  paused: number;
  pastDue: number;
  cancelled: number;
}

export function counts(data: OwnerData, ctx: AnalyticsContext): ClientCounts {
  const { clients } = data;
  return {
    active: ctx.active.length,
    paused: clients.filter((c) => c.status === "Paused" || c.billingStatus === "Paused").length,
    pastDue: clients.filter((c) => c.billingStatus === "Past Due").length,
    cancelled: clients.filter((c) => c.status === "Churned" || c.billingStatus === "Cancelled").length,
  };
}

export interface Capacity {
  capacity: number;
  fill: number; // 0-100
  remaining: number; // >= 0
}

export function capacity(_data: OwnerData, ctx: AnalyticsContext): Capacity {
  const cap = ctx.config.clientCapacity;
  const active = ctx.active.length;
  return {
    capacity: cap,
    fill: cap > 0 ? Math.min(100, Math.round((active / cap) * 100)) : 0,
    remaining: Math.max(0, cap - active),
  };
}

/** Clients whose start date falls in the current calendar month. */
export function newThisMonth(data: OwnerData, ctx: AnalyticsContext): number {
  return data.clients.filter((c) => c.startDate && monthKey(c.startDate) === ctx.thisKey).length;
}

/** Clients cancelled (by cancelledDate) in the current calendar month. */
export function lostThisMonth(data: OwnerData, ctx: AnalyticsContext): number {
  return data.clients.filter((c) => c.cancelledDate && monthKey(c.cancelledDate) === ctx.thisKey).length;
}

/** Average months a client stays (churned basis, else whole roster). */
export function avgLifetimeMonths(data: OwnerData, ctx: AnalyticsContext): number {
  const churned = data.clients.filter((c) => c.status === "Churned" || c.cancelledDate);
  const basis = churned.length ? churned : data.clients;
  if (!basis.length) return 0;
  const total = basis.reduce((n, c) => n + monthsBetween(c.startDate, c.cancelledDate || ctx.nowISO), 0);
  return Math.round(total / basis.length);
}

/** Monthly churn = clients lost this month / (active + lost this month); null if no base. */
export function churnRate(data: OwnerData, ctx: AnalyticsContext): number | null {
  const lost = lostThisMonth(data, ctx);
  const base = ctx.active.length + lost;
  return base > 0 ? lost / base : null;
}

/** Active-client count at each of the last 6 month boundaries (oldest → newest). */
export function growthTrend(data: OwnerData, ctx: AnalyticsContext): { month: string; count: number }[] {
  const out: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const end = monthKeyOffset(ctx.nowISO, i) + "-28";
    const count = data.clients.filter(
      (c) => c.startDate && c.startDate <= end && (!c.cancelledDate || c.cancelledDate > end),
    ).length;
    out.push({ month: monthLabelOffset(ctx.nowISO, i), count });
  }
  return out;
}

/** Average check-in compliance across active clients (0-100). */
export function avgCompliance(_data: OwnerData, ctx: AnalyticsContext): number {
  const a = ctx.active;
  return a.length ? Math.round(a.reduce((n, c) => n + (c.compliance ?? 0), 0) / a.length) : 0;
}

export interface TopClient {
  id: string;
  name: string;
  initials: string;
  lifetimeRevenue: number;
  monthlyRate: number;
}

export function topClients(data: OwnerData, _ctx: AnalyticsContext, limit = 5): TopClient[] {
  return [...data.clients]
    .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
    .slice(0, limit)
    .map((c: Client) => ({
      id: c.id,
      name: c.name,
      initials: c.avatarInitials,
      lifetimeRevenue: c.lifetimeRevenue,
      monthlyRate: c.monthlyRate,
    }));
}
