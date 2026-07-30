import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/clients — list all clients.
export async function GET() {
  const data = await notion.getClients();
  return NextResponse.json({ data });
}

// POST /api/clients — create a client (coach-side "Add Client").
// Fields: name (required), email, phone, status, coachingFocus, startDate,
// renewalDate, monthlyRate, primaryGoal, source, plan, billingStatus, riskLevel.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name?.trim()) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const data = await notion.createClient(body);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/clients failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
