import { NextResponse } from "next/server";
import { getClients } from "@/lib/store";
import { signToken, MAGIC_TTL_SECONDS } from "@/lib/auth/session";
import { sendMagicLink } from "@/lib/auth/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/portal/login { email } — email a client a magic login link.
 * Always responds ok (no account enumeration); only sends when the email
 * matches a real, non-churned client and email delivery is configured.
 */
export async function POST(request: Request) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as { email?: string };
    const addr = (email || "").trim().toLowerCase();
    if (!addr) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });

    const clients = await getClients();
    const client = clients.find(
      (c) => c.email && c.email.toLowerCase() === addr && c.status !== "Churned",
    );

    if (client) {
      const token = await signToken({ cid: client.id, email: addr }, MAGIC_TTL_SECONDS);
      const link = `${new URL(request.url).origin}/api/portal/verify?token=${encodeURIComponent(token)}`;
      await sendMagicLink(client.email, link, client.name);
    }
    // Uniform response regardless of whether the email matched.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] POST /api/portal/login failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to process" }, { status: 500 });
  }
}
