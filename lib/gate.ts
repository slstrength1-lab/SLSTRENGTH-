/**
 * Site password gate — shared helpers used by both the edge middleware and the
 * login route so they compute the same auth token. Uses Web Crypto (available
 * in both the edge and node runtimes), so no dependency and no secret is ever
 * stored in the cookie — only a one-way hash of the configured password.
 */
export const GATE_COOKIE = "sl_auth";

/** One-way token derived from the site password (never the raw password). */
export async function gateToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode("sl-strength-os::" + secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
