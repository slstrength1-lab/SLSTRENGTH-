import { NextResponse } from "next/server";
import { isAgentLive } from "@/lib/agents/shared/llm";
import { runDailyCycle } from "@/lib/agents/automation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // the full cycle runs several advisors

/**
 * POST /api/agents/cron — run the daily automation cycle: every advisor runs,
 * safe-tier results auto-apply, and review/manual proposals wait in the inbox.
 * Point a scheduler at this (Netlify Scheduled Function, cron, or the platform's
 * Routines). Protect it by setting CRON_SECRET and sending it as a Bearer token
 * (or an x-cron-secret header); when CRON_SECRET is unset the endpoint is open.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization") || request.headers.get("x-cron-secret") || "";
    const token = header.replace(/^Bearer\s+/i, "");
    if (token !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  if (!isAgentLive) {
    return NextResponse.json(
      { ok: false, error: "AI layer not configured — set ANTHROPIC_API_KEY." },
      { status: 400 },
    );
  }
  try {
    const result = await runDailyCycle(new Date().toISOString());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api] POST /api/agents/cron failed:", err);
    return NextResponse.json({ ok: false, error: "Daily cycle failed." }, { status: 500 });
  }
}
