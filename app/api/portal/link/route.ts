import { NextResponse } from "next/server";
import { getClientById } from "@/lib/store";
import { signToken, MAGIC_TTL_SECONDS } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/portal/link { clientId } — COACH-ONLY (gated behind the coach
 * password by middleware). Mints a magic login link for a client so Shane can
 * send it to them directly (works with no email service configured). The link
 * lasts 30 minutes; the session it creates lasts 30 days.
 */
export async function POST(request: Request) {
  try {
    const { clientId } = (await request.json().catch(() => ({}))) as { clientId?: string };
    if (!clientId) return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });

    const client = await getClientById(clientId);
    if (!client) return NextResponse.json({ ok: false, error: "client not found" }, { status: 404 });
    if (!client.email) {
      return NextResponse.json(
        { ok: false, error: "This client has no email on file in Notion." },
        { status: 400 },
      );
    }

    const token = await signToken({ cid: client.id, email: client.email.toLowerCase() }, MAGIC_TTL_SECONDS);
    const link = `${new URL(request.url).origin}/api/portal/verify?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ ok: true, link, expiresInMinutes: MAGIC_TTL_SECONDS / 60 });
  } catch (err) {
    console.error("[api] POST /api/portal/link failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to generate link" }, { status: 500 });
  }
}
