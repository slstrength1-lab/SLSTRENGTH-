/**
 * Phase 5 — Advanced Automation.
 *
 * The daily cycle runs every advisor on a schedule and, crucially, encodes the
 * automation tiers from the architecture review: `safe`-tier recommendations
 * (read-only synthesis) are auto-applied; `review`/`manual` proposals are left
 * pending for Shane in the approval inbox. This is how the system graduates
 * proven, low-risk work to autonomous while keeping a human on everything that
 * reaches a client.
 *
 * Trigger it from a scheduler (Netlify Scheduled Function, cron, or the
 * platform's Routines) via POST /api/agents/cron.
 */
import { runBriefing } from "./briefing";
import { runCoachingForClient } from "./coaching";
import { runSalesForLead } from "./sales";
import { runGrowth } from "./growth";
import { applyRecommendation } from "./shared/execution";
import { notion } from "@/lib/notion";
import { getOwnerData } from "@/lib/store";
import * as analytics from "@/lib/analytics";
import type { Recommendation } from "@/lib/types";

// Keep a daily cycle bounded — coach the clients who need it most, chase the
// stalest leads. Raise as volume (and trust) grows.
const MAX_CLIENTS = 5;
const MAX_LEADS = 5;

/** Auto-apply only the safe tier; everything else stays pending for review. */
async function autoApplySafe(recs: Recommendation[], date: string): Promise<number> {
  let applied = 0;
  for (const r of recs) {
    if (r.riskTier !== "safe") continue;
    try {
      const exec = await applyRecommendation(r);
      await notion.updateRecommendation(r.id, {
        status: exec.applied ? "applied" : "approved",
        appliedResultId: exec.resultId,
        reviewedBy: "Automation",
        reviewed: date,
      });
      if (exec.applied) applied += 1;
    } catch {
      // leave it pending if execution fails
    }
  }
  return applied;
}

export interface CycleResult {
  created: number;
  autoApplied: number;
  pendingReview: number;
  agents: { briefing: number; growth: number; coaching: number; sales: number };
}

export async function runDailyCycle(nowISO: string): Promise<CycleResult> {
  const date = nowISO.slice(0, 10);
  const agents = { briefing: 0, growth: 0, coaching: 0, sales: 0 };
  const all: Recommendation[] = [];

  const briefing = await runBriefing(nowISO);
  if (briefing) {
    all.push(briefing);
    agents.briefing = 1;
  }

  const growth = await runGrowth(nowISO);
  if (growth) {
    all.push(...growth);
    agents.growth = growth.length;
  }

  const data = await getOwnerData();

  // Coaching — lowest health scores among active clients first.
  const active = data.clients.filter(analytics.isActiveClient);
  const targets = analytics.clients
    .clientHealthScores(active, date)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_CLIENTS)
    .map((s) => s.clientId);
  for (const clientId of targets) {
    const recs = await runCoachingForClient(clientId, nowISO);
    if (recs) {
      all.push(...recs);
      agents.coaching += recs.length;
    }
  }

  // Sales — leads that are due for follow-up.
  const dueLeads = analytics.leads.needsFollowUp(data.leads, date).slice(0, MAX_LEADS);
  for (const lead of dueLeads) {
    const recs = await runSalesForLead(lead.id, nowISO);
    if (recs) {
      all.push(...recs);
      agents.sales += recs.length;
    }
  }

  const autoApplied = await autoApplySafe(all, date);
  return {
    created: all.length,
    autoApplied,
    pendingReview: all.filter((r) => r.riskTier !== "safe").length,
    agents,
  };
}
