import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";
import type { CoachNotePatch } from "@/lib/notion";

export const dynamic = "force-dynamic";

// PATCH /api/coach-notes/:id — update a note's status, type, priority, or body.
// Archiving is a soft status change (status = "Archived"); history is preserved.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await request.json()) as CoachNotePatch;
    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });
    }
    const data = await notion.updateCoachNote(params.id, patch);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data });
  } catch (err) {
    console.error(`[api] PATCH /api/coach-notes/${params.id} failed:`, err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
