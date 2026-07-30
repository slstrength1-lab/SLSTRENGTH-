import { NextResponse } from "next/server";
import { verifyToken, signToken, CLIENT_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/portal/verify?token=… — consume a magic-link token and start a
 * client session. On success sets the HttpOnly session cookie and redirects to
 * the portal; on failure redirects back to the login screen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const claims = await verifyToken(token);

  if (!claims) {
    return NextResponse.redirect(new URL("/portal-login?error=expired", url.origin));
  }

  const session = await signToken({ cid: claims.cid, email: claims.email }, SESSION_TTL_SECONDS);
  const res = NextResponse.redirect(new URL("/dashboard", url.origin));
  res.cookies.set(CLIENT_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
