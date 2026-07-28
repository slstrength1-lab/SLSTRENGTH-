import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/coach-notes?clientId=|?leadId= — list coach notes (newest first).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const leadId = searchParams.get("leadId");
  let data = await notion.getCoachNotes();
  if (clientId) data = data.filter((n) => n.clientId === clientId);
  if (leadId) data = data.filter((n) => n.leadId === leadId);
  data.sort((a, b) => (a.created < b.created ? 1 : -1));
  return NextResponse.json({ data });
}

// POST /api/coach-notes — create a coach note (or AI recommendation) for a
// client. Persists to the Notion Coach Notes database, or returns a local
// record when offline (sample fallback).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if ((!body?.clientId && !body?.leadId) || !body?.body?.trim()) {
      return NextResponse.json(
        { ok: false, error: "clientId or leadId, plus body, are required" },
        { status: 400 },
      );
    }
    const data = await notion.createCoachNote(body);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/coach-notes failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
