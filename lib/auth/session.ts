/**
 * Client auth tokens — HMAC-signed, stateless. Used for two things:
 *   1. magic-link tokens (short-lived) emailed to a client to log in, and
 *   2. the client session cookie (long-lived) set after a successful login.
 * Uses Web Crypto so the same code verifies in the edge middleware and in
 * node route handlers. No database — the signature is the trust.
 */
export const CLIENT_COOKIE = "sl_client";
export const MAGIC_TTL_SECONDS = 30 * 60; // 30 minutes
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || process.env.SITE_PASSWORD || "sl-strength-os-dev-secret";
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface TokenClaims {
  cid: string; // Notion client id
  email: string;
  exp: number; // unix seconds
}

export async function signToken(data: { cid: string; email: string }, ttlSeconds: number): Promise<string> {
  const payload: TokenClaims = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyToken(token: string | undefined | null): Promise<TokenClaims | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body)));
    if (!timingSafeEqual(expected, fromB64url(sig))) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body))) as TokenClaims;
    if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
