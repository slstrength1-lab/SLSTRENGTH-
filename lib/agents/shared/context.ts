/**
 * Context Assembler — the single place that gathers business/client state for
 * the AI advisors, so every advisor reads consistent input computed one way
 * (see docs/ai-architecture-review.md §6). Pure read: pulls from the store +
 * analytics, never Notion directly.
 */
import { getOwnerData, summarizeOwner, getRecommendations } from "@/lib/store";
import { getOwnerConfig } from "@/lib/config";
import * as analytics from "@/lib/analytics";
import type { OwnerSummary, Lead } from "@/lib/types";
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
