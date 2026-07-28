/**
 * Lead / CRM analytics — the single analytics source for future CRM surfaces
 * (dashboard card, pipeline board, Lead Command Center).
 *
 * Pure and framework-agnostic: every function takes `Lead[]` (plus an optional
 * `nowISO` for date math) and returns computed metrics — no Notion calls, no
 * store access, no UI assumptions. Follows the same style as the other analytics
 * modules (local result interfaces, `dates` helpers, one-line JSDoc).
 *
 * Stage semantics (Step 1 additive "Lost" included; nothing renamed):
 *   won      = "Closed Won"  (the conversion trigger)
 *   lost     = "Lost"
 *   inactive = won | lost | "Nurture"   → everything else is an ACTIVE pipeline lead
 */

import type { Lead, LeadStage } from "../types";
import { monthKey, dayDiff } from "./dates";

export const WON_STAGE: LeadStage = "Closed Won";
export const LOST_STAGE: LeadStage = "Lost";

/** Pipeline column order (existing board order + "Lost" appended). */
export const STAGE_ORDER: LeadStage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Call Scheduled",
  "Offer Presented",
  "Closed Won",
  "Nurture",
  "Lost",
];

/**
 * Canonical display labels (the approved display-map: existing Notion option
 * names are preserved; surfaces render these instead). Pure data — reused by
 * both analytics and future UI so the mapping lives in one place.
 */
export const STAGE_LABELS: Record<LeadStage, string> = {
  New: "New Lead",
  Contacted: "Contacted",
  Qualified: "Qualified",
  "Call Scheduled": "Consult Scheduled",
  "Offer Presented": "Proposal Sent",
  "Closed Won": "Won",
  Nurture: "Nurture",
  Lost: "Lost",
};

export function stageLabel(stage: LeadStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

const INACTIVE_STAGES = new Set<LeadStage>([WON_STAGE, LOST_STAGE, "Nurture"]);

/** An active pipeline lead is anything not won, lost, or parked in Nurture. */
export function isActiveLead(lead: Lead): boolean {
  return !INACTIVE_STAGES.has(lead.stage);
}

/** Close probability as a 0-1 fraction (blank → 0, so forecasts stay honest). */
function probability(lead: Lead): number {
  const p = lead.closeProbability;
  if (typeof p !== "number") return 0;
  return Math.max(0, Math.min(100, p)) / 100;
}

/* ------------------------------------------------------------------ */
/* Pipeline value                                                      */
/* ------------------------------------------------------------------ */

/** Active pipeline leads. */
export function activeLeads(leads: Lead[]): Lead[] {
  return leads.filter(isActiveLead);
}

/** Total estimated value of the active pipeline. */
export function totalPipelineValue(leads: Lead[]): number {
  return activeLeads(leads).reduce((n, l) => n + (l.estValue || 0), 0);
}

/** Probability-weighted pipeline value (expected revenue) of active leads. */
export function weightedPipelineValue(leads: Lead[]): number {
  return Math.round(activeLeads(leads).reduce((n, l) => n + (l.estValue || 0) * probability(l), 0));
}

export interface StagePipeline {
  stage: LeadStage;
  label: string;
  count: number;
  value: number;
}

/** Count + estimated value per stage, in board order. */
export function pipelineByStage(leads: Lead[]): StagePipeline[] {
  return STAGE_ORDER.map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage);
    return {
      stage,
      label: stageLabel(stage),
      count: inStage.length,
      value: inStage.reduce((n, l) => n + (l.estValue || 0), 0),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Conversion                                                          */
/* ------------------------------------------------------------------ */

/** Won leads ("Closed Won"). */
export function wonLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.stage === WON_STAGE);
}

/** Lost leads. */
export function lostLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.stage === LOST_STAGE);
}

/** Close rate = won / (won + lost) among decided leads; null when none decided. */
export function closeRate(leads: Lead[]): number | null {
  const won = wonLeads(leads).length;
  const decided = won + lostLeads(leads).length;
  return decided > 0 ? won / decided : null;
}

/** Conversion rate = won / all leads; null when there are no leads. */
export function conversionRate(leads: Lead[]): number | null {
  return leads.length ? wonLeads(leads).length / leads.length : null;
}

/* ------------------------------------------------------------------ */
/* Time-based (created / follow-up / consults)                         */
/* ------------------------------------------------------------------ */

/** Leads created in the current calendar month (needs createdDate). */
export function leadsThisMonth(leads: Lead[], nowISO: string = today()): Lead[] {
  const key = monthKey(nowISO);
  return leads.filter((l) => l.createdDate && monthKey(l.createdDate) === key);
}

/** Active leads whose Next Follow-up is due today or overdue. */
export function needsFollowUp(leads: Lead[], nowISO: string = today()): Lead[] {
  return activeLeads(leads).filter((l) => {
    if (!l.nextFollowUp) return false;
    const d = dayDiff(nowISO, l.nextFollowUp);
    return d !== null && d <= 0;
  });
}

/** Leads with a consultation dated `offsetDays` from now (0 = today, 1 = tomorrow). */
export function consultsOn(leads: Lead[], offsetDays: number, nowISO: string = today()): Lead[] {
  return leads.filter((l) => {
    if (!l.consultDate) return false;
    return dayDiff(nowISO, l.consultDate) === offsetDays;
  });
}

export function consultsToday(leads: Lead[], nowISO: string = today()): Lead[] {
  return consultsOn(leads, 0, nowISO);
}

export function consultsTomorrow(leads: Lead[], nowISO: string = today()): Lead[] {
  return consultsOn(leads, 1, nowISO);
}

/* ------------------------------------------------------------------ */
/* Composite summary                                                   */
/* ------------------------------------------------------------------ */

export interface LeadSummary {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalPipelineValue: number;
  weightedPipelineValue: number; // expected revenue
  leadsThisMonth: number;
  closeRate: number | null;
  conversionRate: number | null;
  needsFollowUp: number;
  consultsToday: number;
  consultsTomorrow: number;
  pipelineByStage: StagePipeline[];
}

/**
 * Compose the full lead summary for CRM surfaces. Pure — pass `nowISO` for
 * deterministic tests. Everything derives from the passed leads; no fabrication
 * (expected revenue stays 0 until Close Probability is filled in).
 */
export function summarizeLeads(leads: Lead[], nowISO: string = today()): LeadSummary {
  return {
    totalLeads: leads.length,
    activeLeads: activeLeads(leads).length,
    wonLeads: wonLeads(leads).length,
    lostLeads: lostLeads(leads).length,
    totalPipelineValue: totalPipelineValue(leads),
    weightedPipelineValue: weightedPipelineValue(leads),
    leadsThisMonth: leadsThisMonth(leads, nowISO).length,
    closeRate: closeRate(leads),
    conversionRate: conversionRate(leads),
    needsFollowUp: needsFollowUp(leads, nowISO).length,
    consultsToday: consultsToday(leads, nowISO).length,
    consultsTomorrow: consultsTomorrow(leads, nowISO).length,
    pipelineByStage: pipelineByStage(leads),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
