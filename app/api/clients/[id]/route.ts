import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";
import type { ClientPatch } from "@/lib/notion";

export const dynamic = "force-dynamic";

// PATCH /api/clients/:id — update billing/plan/status fields on a client.
// Powers the Business module Quick Actions (Update Plan / Pause / Cancel).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await request.json()) as ClientPatch;
    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });
    }
    const data = await notion.updateClient(params.id, patch);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data });
  } catch (err) {
    console.error(`[api] PATCH /api/clients/${params.id} failed:`, err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
