import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";
import { CLIENT_COOKIE, verifyToken } from "@/lib/auth/session";

/**
 * Two gates, one middleware (active only when SITE_PASSWORD is set — dev stays
 * open):
 *   • Client portal (Dashboard/Training/Nutrition/Check-ins/Progress/Messages)
 *     → requires a valid client magic-link session (a coach session also passes,
 *     so Shane can preview a client view). Otherwise → /portal-login.
 *   • Everything else (the /coach area + coach APIs) → requires the coach
 *     password session. Otherwise → /login.
 * Public: the two login screens and the endpoints that authenticate them.
 */
const PORTAL_PAGES = ["/dashboard", "/training", "/nutrition", "/checkins", "/progress", "/messages"];
const PORTAL_APIS = ["/api/checkins"];

function matches(pathname: string, roots: string[]): boolean {
  return roots.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isPublic(pathname: string): boolean {
  // Only the two login screens and their auth endpoints are public. The
  // homepage is treated as coach area so the whole site locks; clients reach
  // their portal via their magic link (→ /dashboard), not the homepage.
  return (
    pathname === "/login" ||
    pathname === "/portal-login" ||
    pathname === "/api/login" ||
    pathname === "/api/portal/login" ||
    pathname === "/api/portal/verify"
  );
}

async function coachOk(req: NextRequest, password: string): Promise<boolean> {
  const token = req.cookies.get(GATE_COOKIE)?.value;
  return Boolean(token && token === (await gateToken(password)));
}

async function clientOk(req: NextRequest): Promise<boolean> {
  return Boolean(await verifyToken(req.cookies.get(CLIENT_COOKIE)?.value));
}

export async function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // gates disabled (dev)

  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Client portal — client OR coach session.
  if (matches(pathname, PORTAL_PAGES) || matches(pathname, PORTAL_APIS)) {
    if ((await clientOk(req)) || (await coachOk(req, password))) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/portal-login";
    return NextResponse.redirect(url);
  }

  // Coach area — coach session only.
  if (await coachOk(req, password)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
