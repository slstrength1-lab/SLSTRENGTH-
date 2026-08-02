/**
 * Peer-to-peer payment links (Venmo + Cash App).
 *
 * Neither Venmo nor Cash App has a "charge the client" API — they're P2P apps.
 * What we CAN do is hand the client a deep link (or QR) that opens their app
 * pre-filled with the coach's handle, the amount owed, and a note. The money
 * lands directly in the coach's account; the coach then logs the receipt in the
 * OS as usual (which already computes revenue + MRR).
 *
 * Handles are read from env (set in Netlify, NOT secrets — they're public):
 *   VENMO_HANDLE      e.g. "Shane-Lanteigne"   (with or without a leading @)
 *   CASHAPP_CASHTAG   e.g. "shanelanteigne"    (with or without a leading $)
 *
 * The link builders are pure (no env, no node deps) so they're safe to call from
 * a client component to react to an edited amount.
 */

export interface PaymentHandles {
  venmo?: string;
  cashApp?: string;
}

const clean = (v: string | undefined, strip: RegExp) => (v || "").trim().replace(strip, "");

/** Read configured handles from the environment (server-side). */
export function paymentHandles(): PaymentHandles {
  const venmo = clean(process.env.VENMO_HANDLE, /^@/);
  const cashApp = clean(process.env.CASHAPP_CASHTAG, /^\$/);
  return { venmo: venmo || undefined, cashApp: cashApp || undefined };
}

/** True when at least one payment method is configured. */
export function paymentsConfigured(): boolean {
  const h = paymentHandles();
  return Boolean(h.venmo || h.cashApp);
}

const amt = (n?: number) => (typeof n === "number" && n > 0 ? n.toFixed(2) : undefined);

/**
 * Venmo pay-intent link. Opens the Venmo app (mobile) or web checkout pre-filled
 * to `handle`, with an optional amount + note.
 */
export function venmoPayLink(handle: string, amount?: number, note?: string): string {
  const u = new URL("https://venmo.com/");
  u.searchParams.set("txn", "pay");
  u.searchParams.set("recipients", clean(handle, /^@/));
  const a = amt(amount);
  if (a) u.searchParams.set("amount", a);
  if (note) u.searchParams.set("note", note);
  return u.toString();
}

/** Venmo profile link (no amount) — used for the scannable QR. */
export function venmoProfileLink(handle: string): string {
  return `https://venmo.com/u/${encodeURIComponent(clean(handle, /^@/))}`;
}

/**
 * Cash App pay link. With an amount it opens straight to that amount; without,
 * it opens the coach's $cashtag so the payer enters it. (Cash App URLs don't
 * carry a note.)
 */
export function cashAppPayLink(cashtag: string, amount?: number): string {
  const tag = clean(cashtag, /^\$/);
  const a = amt(amount);
  return a ? `https://cash.app/$${tag}/${a}` : `https://cash.app/$${tag}`;
}
