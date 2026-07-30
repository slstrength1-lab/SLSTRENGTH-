import { NextResponse } from "next/server";
import { isAgentLive, lastAgentError } from "@/lib/agents/shared/llm";
import { runBriefing } from "@/lib/agents/briefing";
import { runCoachingForClient } from "@/lib/agents/coaching";
import { runSalesForLead } from "@/lib/agents/sales";
import { runGrowth } from "@/lib/agents/growth";
import type { Recommendation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // LLM calls can take a while

/**
 * POST /api/agents/:name — run an AI advisor. Advisors read context, call Claude,
 * and file proposals in the recommendation ledger (pending review). Nothing
 * reaches a client here — approval happens in the inbox.
 *
 *   briefing            → A1 Executive Strategist (no body)
 *   coaching {clientId} → A2 Client Coaching Advisor
 *   sales    {leadId}   → A3 Sales Assistant
 *   growth              → A4 Growth & Content Engine (no body)
 */
type Body = { clientId?: string; leadId?: string };
type Runner = (nowISO: string, body: Body) => Promise<Recommendation | Recommendation[] | null>;

const AGENTS: Record<string, Runner> = {
  briefing: (now) => runBriefing(now),
  coaching: (now, b) => (b.clientId ? runCoachingForClient(b.clientId, now) : Promise.resolve(null)),
  sales: (now, b) => (b.leadId ? runSalesForLead(b.leadId, now) : Promise.resolve(null)),
  growth: (now) => runGrowth(now),
};

export async function POST(request: Request, { params }: { params: { name: string } }) {
  const run = AGENTS[params.name];
  if (!run) {
    return NextResponse.json({ ok: false, error: `unknown agent "${params.name}"` }, { status: 404 });
  }
  if (!isAgentLive) {
    return NextResponse.json(
      { ok: false, error: "AI layer not configured — set ANTHROPIC_API_KEY." },
      { status: 400 },
    );
  }
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // no body — fine for briefing/growth
  }
  try {
    const result = await run(new Date().toISOString(), body);
    const recs = Array.isArray(result) ? result : result ? [result] : [];
    if (!recs.length) {
      const reason = lastAgentError
        ? `The AI advisor returned nothing — ${lastAgentError}.`
        : "No recommendation produced (missing clientId/leadId, or the model returned nothing).";
      return NextResponse.json({ ok: false, error: reason }, { status: 502 });
    }
    return NextResponse.json({ ok: true, count: recs.length, data: recs }, { status: 201 });
  } catch (err) {
    console.error(`[api] POST /api/agents/${params.name} failed:`, err);
    return NextResponse.json({ ok: false, error: "Agent run failed." }, { status: 500 });
  }
}
