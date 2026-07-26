import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/programs — list programs. Optional ?clientId= filter.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  let data = await notion.getPrograms();
  if (clientId) data = data.filter((p) => p.clientId === clientId);
  return NextResponse.json({ data });
}

// POST /api/programs — assign a program to a client.
// Fields: clientId, type, phase, startDate, endDate.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.clientId) {
      return NextResponse.json({ ok: false, error: "clientId is required" }, { status: 400 });
    }
    if (!body?.type || !body?.phase) {
      return NextResponse.json({ ok: false, error: "type and phase are required" }, { status: 400 });
    }
    const data = await notion.createProgram(body);
    return NextResponse.json(
      { ok: true, mode: isLive ? "live" : "sample", data },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api] POST /api/programs failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
