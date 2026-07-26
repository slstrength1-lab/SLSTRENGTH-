import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/checkins — list check-ins. Optional ?clientId= filter.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  let data = await notion.getCheckIns();
  if (clientId) data = data.filter((c) => c.clientId === clientId);
  return NextResponse.json({ data });
}

// POST /api/checkins — submit a weekly check-in (stub: echoes payload).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  // TODO: notion.createCheckIn(body) once the Notion client is wired up.
  return NextResponse.json(
    { ok: true, received: body, note: "Prototype stub — not persisted." },
    { status: 201 },
  );
}
