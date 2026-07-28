/**
 * Client-base analytics — counts, capacity, growth, lifetime.
 * Pure functions over OwnerData + AnalyticsContext.
 */

import type { Client } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { monthKey, monthsBetween, monthKeyOffset, monthLabelOffset, dayDiff } from "./dates";

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

/* ------------------------------------------------------------------ */
/* Client Health Score (Step 6B)                                       */
/* ------------------------------------------------------------------ */
/**
 * A transparent 0-100 client-health score: engagement + training consistency +
 * recovery/compliance. Deliberately excludes revenue / lifetime value / business
 * value — this measures how the client is *doing*, not what they're worth.
 *
 * Four factors (Training 40, Check-in 20, Nutrition 20, Risk/Status 20). Missing
 * data is never fabricated: a factor with no data is marked `available: false`
 * and dropped from the denominator, so the score is computed only over the
 * pillars we actually have — and `confidence` reports how much of the 100-point
 * scale was backed by real data. Every factor exposes points/max/detail so the
 * number is fully explainable.
 */
export type HealthCategory = "Excellent" | "Good" | "Moderate" | "At risk";

export interface HealthFactor {
  name: string;
  points: number; // earned
  max: number; // possible
  available: boolean; // had underlying data
  detail: string;
}

export interface ClientHealthScore {
  clientId: string;
  score: number; // 0-100 over available factors
  category: HealthCategory;
  confidence: number; // 0-1 = availableMax / 100
  factors: HealthFactor[];
}

function trainingFactor(c: Client): HealthFactor {
  const wc = c.workoutCompletion;
  if (typeof wc !== "number") {
    return { name: "Training", points: 0, max: 40, available: false, detail: "No workout data yet" };
  }
  const points = wc >= 90 ? 40 : wc >= 75 ? 30 : wc >= 50 ? 20 : 10;
  const band = wc >= 90 ? "excellent" : wc >= 75 ? "good" : wc >= 50 ? "moderate" : "poor";
  return { name: "Training", points, max: 40, available: true, detail: `${wc}% workout completion (${band})` };
}

function checkInFactor(c: Client, nowISO: string): HealthFactor {
  const days = c.lastCheckIn ? dayDiff(c.lastCheckIn, nowISO) : null;
  const recency = days === null ? 0 : days <= 7 ? 12 : days <= 14 ? 9 : days <= 21 ? 5 : days <= 35 ? 2 : 0;
  const total = c.totalCheckIns ?? 0;
  const volume = total >= 8 ? 8 : total >= 4 ? 6 : total >= 2 ? 4 : total >= 1 ? 2 : 0;
  const available = Boolean(c.lastCheckIn) || total > 0;
  const detail = days === null ? "No check-ins on record" : `Last check-in ${days}d ago · ${total} total`;
  return { name: "Check-in engagement", points: recency + volume, max: 20, available, detail };
}

function nutritionFactor(c: Client): HealthFactor {
  const nc = c.avgNutritionCompliance;
  if (typeof nc !== "number") {
    return { name: "Nutrition", points: 0, max: 20, available: false, detail: "No nutrition data" };
  }
  const clamped = Math.max(0, Math.min(100, nc));
  return { name: "Nutrition", points: Math.round((20 * clamped) / 100), max: 20, available: true, detail: `${nc}% nutrition compliance` };
}

function riskFactor(c: Client): HealthFactor {
  const riskPts = c.riskLevel === "Green" ? 10 : c.riskLevel === "Yellow" ? 5 : 0;
  const compPts = Math.round((10 * Math.max(0, Math.min(100, c.compliance ?? 0))) / 100);
  let points = riskPts + compPts;
  let detail = `${c.riskLevel} risk · ${c.compliance ?? 0}% compliance`;
  if (c.status === "Churned") {
    points = 0;
    detail += " · churned";
  } else if (c.status === "Paused") {
    points = Math.round(points * 0.5);
    detail += " · paused";
  }
  return { name: "Risk & status", points, max: 20, available: true, detail };
}

export function healthCategory(score: number): HealthCategory {
  return score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Moderate" : "At risk";
}

/** Transparent 0-100 health score for one client. Pure; pass nowISO for tests. */
export function clientHealthScore(
  c: Client,
  nowISO: string = new Date().toISOString().slice(0, 10),
): ClientHealthScore {
  const factors = [trainingFactor(c), checkInFactor(c, nowISO), nutritionFactor(c), riskFactor(c)];
  const available = factors.filter((f) => f.available);
  const availableMax = available.reduce((n, f) => n + f.max, 0);
  const earned = available.reduce((n, f) => n + f.points, 0);
  const score = availableMax > 0 ? Math.round((100 * earned) / availableMax) : 0;
  return {
    clientId: c.id,
    score,
    category: healthCategory(score),
    confidence: Math.round((availableMax / 100) * 100) / 100,
    factors,
  };
}

/** Health scores for a set of clients (same order). */
export function clientHealthScores(
  clients: Client[],
  nowISO: string = new Date().toISOString().slice(0, 10),
): ClientHealthScore[] {
  return clients.map((c) => clientHealthScore(c, nowISO));
}
