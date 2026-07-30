import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";
import { getRecommendationById } from "@/lib/store";
import { applyRecommendation } from "@/lib/agents/shared/execution";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/recommendations/:id — the human review actions from the approval
 * inbox:
 *   { action: "edit",    draft }        → revise the proposed draft in place
 *   { action: "reject" | "dismiss" }    → decline / retire (audit preserved)
 *   { action: "approve", draft? }       → approve, then execute into a real record
 *
 * Approve is the only action that runs the execution service (the sole writer of
 * approved changes to domain tables).
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const body = await request.json();
    const action = body?.action as "edit" | "reject" | "dismiss" | "approve" | undefined;
    const reviewedBy = typeof body?.reviewedBy === "string" && body.reviewedBy ? body.reviewedBy : "Coach";
    const now = new Date().toISOString().slice(0, 10);

    if (action === "edit") {
      if (typeof body?.draft !== "string") {
        return NextResponse.json({ ok: false, error: "draft required" }, { status: 400 });
      }
      const data = await notion.updateRecommendation(id, { draft: body.draft });
      return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data });
    }

    if (action === "reject" || action === "dismiss") {
      const data = await notion.updateRecommendation(id, {
        status: action === "reject" ? "rejected" : "dismissed",
        reviewed: now,
        reviewedBy,
      });
      return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data });
    }

    if (action === "approve") {
      const rec = await getRecommendationById(id);
      if (!rec) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
      // Approve an edited draft if one was supplied with the approval.
      const draft = typeof body?.draft === "string" ? body.draft : rec.draft;
      await notion.updateRecommendation(id, { status: "approved", reviewed: now, reviewedBy, draft });
      const exec = await applyRecommendation({ ...rec, draft });
      const data = await notion.updateRecommendation(id, {
        status: exec.applied ? "applied" : "approved",
        appliedResultId: exec.resultId,
      });
      return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data, execution: exec });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (err) {
    console.error(`[api] PATCH /api/recommendations/${id} failed:`, err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
