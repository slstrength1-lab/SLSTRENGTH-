import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";
import type { LeadStage } from "@/lib/types";

export const dynamic = "force-dynamic";

// PATCH /api/leads/:id — update a lead's stage.
// When the stage becomes "Closed Won", a linked Client record is created
// (copying name, goal, source, and coaching focus from the lead).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const stage = body?.stage as LeadStage | undefined;
    if (!stage) {
      return NextResponse.json({ ok: false, error: "stage is required" }, { status: 400 });
    }
    const { lead, client } = await notion.updateLeadStage(params.id, stage);
    return NextResponse.json({
      ok: true,
      mode: isLive ? "live" : "sample",
      lead,
      client, // present only when the lead was converted (Closed Won)
      converted: Boolean(client),
    });
  } catch (err) {
    console.error(`[api] PATCH /api/leads/${params.id} failed:`, err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
