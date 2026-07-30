import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

/**
 * Site-wide password wall. When SITE_PASSWORD is set, every route requires a
 * valid auth cookie; otherwise visitors are sent to /login. When SITE_PASSWORD
 * is unset (e.g. local dev), the gate is disabled and the app is open.
 *
 * Only guards page + API traffic — the matcher excludes Next internals and
 * static assets so the login screen and its styles always load.
 */
export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // gate disabled

  const { pathname } = req.nextUrl;
  // Always reachable: the login screen and the endpoint that authenticates it.
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(GATE_COOKIE)?.value;
  if (token && token === (await gateToken(password))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Guard everything except Next internals and common static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
