import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/leads — list the sales pipeline.
export async function GET() {
  const data = await notion.getLeads();
  return NextResponse.json({ data });
}

// POST /api/leads — create a lead.
// Fields: Name, Contact, Source, Goal, Problem, Status.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }
    const data = await notion.createLead(body);
    return NextResponse.json(
      { ok: true, mode: isLive ? "live" : "sample", data },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api] POST /api/leads failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
