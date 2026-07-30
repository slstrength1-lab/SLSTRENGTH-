import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";
import type { RecommendationInput } from "@/lib/notion";
import { getRecommendations } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/recommendations?clientId=|?leadId=|?status= — list (newest first,
// name-enriched). The approval inbox and dashboards read here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const leadId = searchParams.get("leadId");
  const status = searchParams.get("status");
  let data = await getRecommendations();
  if (clientId) data = data.filter((r) => r.clientId === clientId);
  if (leadId) data = data.filter((r) => r.leadId === leadId);
  if (status) data = data.filter((r) => r.status === status);
  return NextResponse.json({ mode: isLive ? "live" : "sample", data });
}

// POST /api/recommendations — create a recommendation. Called by the AI advisors
// (and by "System" for deterministic proposals). Writes to the ledger as pending.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendationInput;
    if (!body?.title?.trim() || !body?.kind || !body?.source || !body?.riskTier) {
      return NextResponse.json(
        { ok: false, error: "title, kind, source, and riskTier are required" },
        { status: 400 },
      );
    }
    const data = await notion.createRecommendation(body);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/recommendations failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
