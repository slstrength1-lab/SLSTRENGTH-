import { NextResponse } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

export const runtime = "nodejs";

/**
 * Authenticates the site password wall. Compares the submitted password to
 * SITE_PASSWORD and, on success, sets an HttpOnly auth cookie holding a one-way
 * token (never the raw password). With SITE_PASSWORD unset the gate is off.
 */
export async function POST(req: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.json({ ok: true }); // gate disabled

  const body = await req.json().catch(() => ({}));
  const entered = typeof body?.password === "string" ? body.password : "";

  if (entered !== password) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
