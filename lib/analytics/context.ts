/**
 * Shared analytics context.
 *
 * `OwnerData` is the raw data bundle the store fetches; `AnalyticsContext` is the
 * once-computed derived state (active clients, paid sales, name lookup, month
 * keys) that every analytics module receives so nothing is recomputed and every
 * module sees the same "now". Pure — the store fetches, analytics compute.
 */

import type { Client, Sale, Program, CheckIn, WorkoutRow, CoachNote, NutritionLog, Lead, ContentItem, Metric } from "../types";
import type { OwnerConfig } from "../config";
import { getOwnerConfig } from "../config";
import { monthKey, monthKeyOffset } from "./dates";

export interface OwnerData {
  clients: Client[];
  sales: Sale[];
  programs: Program[];
  checkIns: CheckIn[];
  workouts: WorkoutRow[];
  coachNotes: CoachNote[];
  nutrition: NutritionLog[];
  leads: Lead[];
  content: ContentItem[];
  metrics: Metric[];
}

export const ACTIVE_STATUSES = new Set(["Active", "Onboarding"]);
export function isActiveClient(c: Client): boolean {
  return ACTIVE_STATUSES.has(c.status);
}

export interface AnalyticsContext {
  nowISO: string;
  config: OwnerConfig;
  thisKey: string; // YYYY-MM of now
  lastKey: string; // YYYY-MM of previous month
  active: Client[]; // status Active | Onboarding
  paid: Sale[]; // paymentStatus === "Paid"
  nameOf: Map<string, Client>;
}

export function buildContext(
  data: OwnerData,
  config: OwnerConfig = getOwnerConfig(),
  nowISO: string = new Date().toISOString().slice(0, 10),
): AnalyticsContext {
  return {
    nowISO,
    config,
    thisKey: monthKey(nowISO),
    lastKey: monthKeyOffset(nowISO, 1),
    active: data.clients.filter(isActiveClient),
    paid: data.sales.filter((s) => s.paymentStatus === "Paid"),
    nameOf: new Map(data.clients.map((c) => [c.id, c] as const)),
  };
}
