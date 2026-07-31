"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, PauseCircle, XCircle, Loader2 } from "lucide-react";

/**
 * Business module Quick Actions (client). Every write goes through an API
 * route (UI → /api/* → notion.ts → Notion) — never Notion directly — then
 * router.refresh() re-pulls the server-rendered figures.
 *
 * Log Payment  → POST /api/sales
 * Update Plan  → PATCH /api/clients/:id
 * Pause/Cancel → PATCH /api/clients/:id (Billing Status + Client Status in sync)
 */

const PACKAGES = ["1:1 Coaching", "Nutrition Only", "Strength Program", "Transformation Package", "Consultation", "Personal Training Session"];
const PLANS = ["Monthly", "Quarterly", "Paid in Full", "Per Session", "Custom"];
const SESSION_PACKAGE = "Personal Training Session";
const inputCls =
  "rounded-lg border border-white/[0.06] bg-ink-950/60 px-2 py-1.5 text-xs text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30";
const todayISO = () => new Date().toISOString().slice(0, 10);

type State = "idle" | "saving" | "saved" | "error";
type Panel = null | "payment" | "plan";

export function BusinessActions({
  clientId,
  monthlyRate,
  plan,
}: {
  clientId: string;
  monthlyRate: number;
  plan?: string;
}) {
  const router = useRouter();
  const perSession = (plan ?? "") === "Per Session";
  const [panel, setPanel] = useState<Panel>(null);
  const [state, setState] = useState<State>("idle");

  // Log Payment fields (per-session clients default to a training-session charge)
  const [amount, setAmount] = useState(String(monthlyRate || ""));
  const [pkg, setPkg] = useState(perSession ? SESSION_PACKAGE : PACKAGES[0]);
  // Update Plan fields
  const [planSel, setPlanSel] = useState(plan ?? "Monthly");
  const [rate, setRate] = useState(String(monthlyRate || ""));
  const [nextPay, setNextPay] = useState("");

  async function run(fn: () => Promise<Response>) {
    setState("saving");
    try {
      const res = await fn();
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setState("saved");
      setPanel(null);
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
    }
  }

  const logPayment = () =>
    run(() =>
      fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          amount: Number(amount) || 0,
          package: pkg,
          paymentType: perSession || pkg === SESSION_PACKAGE ? "Per Session" : "Monthly",
          paymentStatus: "Paid",
          date: todayISO(),
        }),
      }),
    );

  const updatePlan = () =>
    run(() =>
      fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planSel,
          monthlyRate: Number(rate) || 0,
          billingStatus: "Active",
          ...(nextPay ? { nextPaymentDate: nextPay } : {}),
        }),
      }),
    );

  const pause = () => {
    if (!confirm("Pause this membership? Client and billing status become Paused.")) return;
    run(() =>
      fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paused", billingStatus: "Paused" }),
      }),
    );
  };

  const cancel = () => {
    if (!confirm("Cancel this membership? This sets status to Churned/Cancelled and stamps today as the cancellation date.")) return;
    run(() =>
      fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Churned", billingStatus: "Cancelled", cancelledDate: todayISO() }),
      }),
    );
  };

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Quick actions</span>
        {state === "saving" && (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {state === "saved" && <span className="text-[11px] text-emerald-400">Saved to SL Strength OS</span>}
        {state === "error" && <span className="text-[11px] text-blood-400">Unable to sync — retry</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPanel(panel === "payment" ? null : "payment")}
          className={`${btn} bg-blood-500 text-white hover:bg-blood-600`}
        >
          <Plus className="h-3.5 w-3.5" /> {perSession ? "Log Session" : "Log Payment"}
        </button>
        <button
          onClick={() => setPanel(panel === "plan" ? null : "plan")}
          className={`${btn} border border-white/10 text-zinc-300 hover:text-white`}
        >
          <CreditCard className="h-3.5 w-3.5" /> Update Plan
        </button>
        <button onClick={pause} className={`${btn} border border-white/10 text-zinc-300 hover:text-white`}>
          <PauseCircle className="h-3.5 w-3.5" /> Pause
        </button>
        <button onClick={cancel} className={`${btn} border border-blood-500/30 text-blood-400 hover:bg-blood-500/10`}>
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>

      {panel === "payment" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Amount ($)
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Package
            <select value={pkg} onChange={(e) => setPkg(e.target.value)} className={inputCls}>
              {PACKAGES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <button onClick={logPayment} disabled={state === "saving"} className={`${btn} bg-blood-500 text-white hover:bg-blood-600 disabled:opacity-40`}>
            Save payment
          </button>
        </div>
      )}

      {panel === "plan" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Plan
            <select value={planSel} onChange={(e) => setPlanSel(e.target.value)} className={inputCls}>
              {PLANS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            {planSel === "Per Session" ? "Session rate ($)" : "Monthly rate ($)"}
            <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Next payment
            <input type="date" value={nextPay} onChange={(e) => setNextPay(e.target.value)} className={inputCls} />
          </label>
          <button onClick={updatePlan} disabled={state === "saving"} className={`${btn} bg-blood-500 text-white hover:bg-blood-600 disabled:opacity-40`}>
            Save plan
          </button>
        </div>
      )}
    </div>
  );
}
