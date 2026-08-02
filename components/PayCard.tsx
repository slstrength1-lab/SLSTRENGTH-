"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, QrCode } from "lucide-react";
import { venmoPayLink, cashAppPayLink } from "@/lib/payments";

/**
 * Pay card — Venmo + Cash App. The amount + note are editable client-side so the
 * deep links rebuild live; the QR codes are static profile links (scan → payer
 * enters the amount), generated server-side and passed in.
 *
 * variant "client" → shown on the portal so the client can pay in two taps.
 * variant "coach"  → shown on the coach's client page with copy-link buttons so
 *                    Shane can drop a pre-filled link into a text/DM or show a QR.
 */
export function PayCard({
  variant,
  venmo,
  cashApp,
  defaultAmount,
  note: initialNote,
  clientName,
}: {
  variant: "client" | "coach";
  venmo?: { handle: string; qr: string };
  cashApp?: { cashtag: string; qr: string };
  defaultAmount?: number;
  note?: string;
  clientName?: string;
}) {
  const [amount, setAmount] = useState(defaultAmount && defaultAmount > 0 ? String(defaultAmount) : "");
  const [note, setNote] = useState(initialNote || "SL Strength coaching");
  const [copied, setCopied] = useState<string>("");

  const n = Number(amount) || undefined;
  const venmoHref = venmo ? venmoPayLink(venmo.handle, n, note) : "";
  const cashHref = cashApp ? cashAppPayLink(cashApp.cashtag, n) : "";

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const inputCls =
    "rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
        <QrCode className="h-4 w-4 text-blood-500" />
        {variant === "coach" ? `Payment links${clientName ? ` — ${clientName}` : ""}` : "Make a payment"}
      </div>
      <p className="mb-4 text-[11px] text-zinc-500">
        {variant === "coach"
          ? "Pre-fill an amount, then copy a link to text/DM the client, or show the QR in person."
          : "Pay by Venmo or Cash App. Set the amount, then tap your app — or scan the code in person."}
      </p>

      {/* Amount + note */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Amount (USD)
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">$</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} w-full`} />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500 sm:col-span-2">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="SL Strength coaching" className={inputCls} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Venmo */}
        {venmo && (
          <div className="rounded-xl border border-white/[0.06] bg-ink-950/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "#3D95CE" }}>Venmo</span>
              <span className="text-[11px] text-zinc-500">@{venmo.handle}</span>
            </div>
            <div className="mb-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={venmo.qr} alt="Venmo QR" width={128} height={128} className="rounded-lg bg-white p-2" />
            </div>
            <div className="flex flex-col gap-2">
              <a href={venmoHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#3D95CE" }}>
                <ExternalLink className="h-4 w-4" /> Pay with Venmo
              </a>
              {variant === "coach" && (
                <button onClick={() => copy("venmo", venmoHref)} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white">
                  {copied === "venmo" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copy Venmo link
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cash App */}
        {cashApp && (
          <div className="rounded-xl border border-white/[0.06] bg-ink-950/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "#00D632" }}>Cash App</span>
              <span className="text-[11px] text-zinc-500">${cashApp.cashtag}</span>
            </div>
            <div className="mb-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cashApp.qr} alt="Cash App QR" width={128} height={128} className="rounded-lg bg-white p-2" />
            </div>
            <div className="flex flex-col gap-2">
              <a href={cashHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-black" style={{ backgroundColor: "#00D632" }}>
                <ExternalLink className="h-4 w-4" /> Pay with Cash App
              </a>
              {variant === "coach" && (
                <button onClick={() => copy("cash", cashHref)} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white">
                  {copied === "cash" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copy Cash App link
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
        {variant === "coach"
          ? "Cash App QR opens your $cashtag; the payer enters the amount. Venmo/Cash App are peer-to-peer — after the money lands, log it in the client's payments to keep revenue + MRR accurate."
          : "After you send it, your coach will confirm and log the payment. Questions? Message your coach."}
      </p>
    </div>
  );
}
