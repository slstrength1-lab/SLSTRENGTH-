import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/checkins — list check-ins. Optional ?clientId= filter.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  let data = await notion.getCheckIns();
  if (clientId) data = data.filter((c) => c.clientId === clientId);
  return NextResponse.json({ data });
}

// POST /api/checkins — submit a weekly check-in (creates a Notion Check-in
// page linked to the client, or writes to sample memory when offline).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.clientId) {
      return NextResponse.json({ ok: false, error: "clientId is required" }, { status: 400 });
    }
    const data = await notion.createCheckIn(body);
    return NextResponse.json(
      { ok: true, mode: isLive ? "live" : "sample", data },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api] POST /api/checkins failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
