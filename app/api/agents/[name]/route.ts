import { NextResponse } from "next/server";
import { isAgentLive } from "@/lib/agents/shared/llm";
import { runBriefing } from "@/lib/agents/briefing";
import type { Recommendation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // LLM calls can take a while

/**
 * POST /api/agents/:name — run an AI advisor. The advisor reads context, calls
 * Claude, and files its proposal in the recommendation ledger (pending review).
 * Nothing reaches a client here — approval happens separately in the inbox.
 */
const AGENTS: Record<string, (nowISO: string) => Promise<Recommendation | null>> = {
  briefing: runBriefing,
};

export async function POST(_request: Request, { params }: { params: { name: string } }) {
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
  try {
    const rec = await run(new Date().toISOString());
    if (!rec) {
      return NextResponse.json({ ok: false, error: "No recommendation produced." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data: rec }, { status: 201 });
  } catch (err) {
    console.error(`[api] POST /api/agents/${params.name} failed:`, err);
    return NextResponse.json({ ok: false, error: "Agent run failed." }, { status: 500 });
  }
}
