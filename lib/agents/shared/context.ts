/**
 * Context Assembler — the single place that gathers business/client state for
 * the AI advisors, so every advisor reads consistent input computed one way
 * (see docs/ai-architecture-review.md §6). Pure read: pulls from the store +
 * analytics, never Notion directly.
 */
import {
  getOwnerData,
  summarizeOwner,
  getRecommendations,
  getClientById,
  checkInsForClient,
  programForClient,
  nutritionLogsForClient,
  coachNotesForClient,
  getLeadById,
  coachNotesForLead,
} from "@/lib/store";
import { getOwnerConfig } from "@/lib/config";
import * as analytics from "@/lib/analytics";
import type { OwnerSummary, Lead, Client } from "@/lib/types";
import { currency } from "@/lib/format";

export interface BusinessContext {
  asOf: string;
  summary: OwnerSummary;
  pendingRecommendations: number;
  /** Compact, model-friendly snapshot of the whole business. */
  brief: string;
}

function line(label: string, value: string): string {
  return `- ${label}: ${value}`;
}

export async function assembleBusinessContext(nowISO: string): Promise<BusinessContext> {
  const date = nowISO.slice(0, 10);
  const data = await getOwnerData();
  const s = summarizeOwner(data, getOwnerConfig(), date);
  const leads = analytics.leads.summarizeLeads(data.leads, date);
  const recs = await getRecommendations();
  const pending = recs.filter((r) => r.status === "pending").length;

  const followUps = analytics.leads
    .needsFollowUp(data.leads, date)
    .map((l: Lead) => l.name)
    .slice(0, 8);
  const consultsToday = analytics.leads.consultsToday(data.leads, date).length;

  const priorityLines = s.priorities
    .filter((g) => g.items.length)
    .map((g) => `${g.label} (${g.items.length})`)
    .join(", ");

  const brief = [
    `Business snapshot as of ${date}:`,
    line("Active clients", `${s.activeClients} of ${s.clientCapacity} capacity (${s.capacityFill}% full)`),
    line("MRR", currency(s.mrr)),
    line("Revenue this month", `${currency(s.monthlyRevenue)} toward ${currency(s.revenueGoal)} goal (${s.goalProgress}%)`),
    line("New clients this month", String(s.newClientsThisMonth)),
    line("Clients lost this month", String(s.lostThisMonth)),
    line("Past-due clients", String(s.pastDueClients)),
    line("Portfolio check-in compliance", `${s.portfolioCompliance}%`),
    line("Pipeline", `${leads.activeLeads} active leads worth ${currency(leads.totalPipelineValue)} (expected ${currency(leads.weightedPipelineValue)})`),
    line("Consults booked today", String(consultsToday)),
    line("Leads needing follow-up", followUps.length ? followUps.join(", ") : "none"),
    line("Programs ending soon", String(s.programsEnding)),
    line("Open coach notes", String(s.pendingNotes)),
    line("Today's priority buckets", priorityLines || "none"),
    line("Pending AI recommendations awaiting review", String(pending)),
  ].join("\n");

  return { asOf: date, summary: s, pendingRecommendations: pending, brief };
}

/* ---- Client context (A2 — Coaching Advisor) ---------------------- */

export interface ClientContext {
  asOf: string;
  client: Client;
  brief: string;
}

/** Assemble one client's full coaching state. Null if the client isn't found. */
export async function assembleClientContext(
  clientId: string,
  nowISO: string,
): Promise<ClientContext | null> {
  const date = nowISO.slice(0, 10);
  const client = await getClientById(clientId);
  if (!client) return null;

  const [checkIns, program, nutrition, notes] = await Promise.all([
    checkInsForClient(clientId),
    programForClient(clientId),
    nutritionLogsForClient(clientId),
    coachNotesForClient(clientId),
  ]);
  const health = analytics.clients.clientHealthScore(client, date);
  const ci = checkIns[0];
  const nut = nutrition[0];

  const brief = [
    `Client: ${client.name} — status ${client.status}, focus ${client.coachingFocus.join("/") || "—"}.`,
    line("Primary goal", client.primaryGoal || "—"),
    line("Health score", `${health.score}/100 (${health.category}, confidence ${Math.round(health.confidence * 100)}%)`),
    line("Risk level", client.riskLevel),
    line("Training", client.workoutCompletion != null ? `${client.workoutCompletion}% completion${client.avgRPE != null ? `, avg RPE ${client.avgRPE}` : ""}` : "no workout data"),
    ci
      ? line("Latest check-in", `${ci.date} — bodyweight ${ci.bodyweight}, compliance ${ci.compliance}%, energy ${ci.energy}, sleep ${ci.sleep}, stress ${ci.stress}. Wins: ${ci.wins || "—"}. Challenges: ${ci.challenges || "—"}`)
      : line("Latest check-in", "none on file"),
    program
      ? line("Active program", `${program.name} — ${program.type}, phase ${program.phase}, status ${program.status}`)
      : line("Active program", "none assigned"),
    nut
      ? line("Nutrition", `${nut.strategy || "—"} — target ${nut.targetCalories} kcal, compliance ${nut.compliance}%`)
      : line("Nutrition", "no plan logged"),
    line(
      "Recent coach notes",
      notes.length ? notes.slice(0, 3).map((n) => `[${n.type}] ${n.body}`).join(" | ") : "none",
    ),
  ].join("\n");

  return { asOf: date, client, brief };
}

/* ---- Lead context (A3 — Sales Assistant) ------------------------- */

export interface LeadContext {
  asOf: string;
  lead: Lead;
  brief: string;
}

/** Assemble one lead's sales context. Null if the lead isn't found. */
export async function assembleLeadContext(leadId: string, nowISO: string): Promise<LeadContext | null> {
  const date = nowISO.slice(0, 10);
  const lead = await getLeadById(leadId);
  if (!lead) return null;
  const notes = await coachNotesForLead(leadId);

  const daysSinceContact = lead.lastContact
    ? Math.max(0, Math.round((Date.parse(date) - Date.parse(lead.lastContact)) / 86400000))
    : null;

  const brief = [
    `Lead: ${lead.name} — stage ${analytics.leads.stageLabel(lead.stage)}, source ${lead.source || "—"}.`,
    line("Interest", lead.interest.join("/") || "—"),
    line("Estimated value", currency(lead.estValue)),
    line("Close probability", typeof lead.closeProbability === "number" ? `${lead.closeProbability}%` : "—"),
    line("Expected revenue", currency(analytics.leads.expectedRevenue(lead))),
    line("Goal", lead.goal || "—"),
    line("Stated problem", lead.problem || "—"),
    line("Days since last contact", daysSinceContact == null ? "unknown" : String(daysSinceContact)),
    line("Next follow-up", lead.nextFollowUp || "not scheduled"),
    line("Consult date", lead.consultDate || "none booked"),
    line("Recent notes", notes.length ? notes.slice(0, 3).map((n) => n.body).join(" | ") : "none"),
  ].join("\n");

  return { asOf: date, lead, brief };
}
