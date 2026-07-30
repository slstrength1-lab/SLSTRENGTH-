"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, X } from "lucide-react";
import type { LeadStage, CoachingFocus } from "@/lib/types";

/**
 * Coach-side "Add Lead" intake form. Writes through POST /api/leads → notion
 * (UI → API → notion → Notion). Captures the CRM fields the pipeline + Lead
 * Command Center use, so a new lead lands fully populated.
 */
const STAGES: LeadStage[] = ["New", "Contacted", "Qualified", "Call Scheduled"];
const SOURCES = ["Instagram", "Referral", "Website", "Word of Mouth", "Facebook", "Other"];
const INTEREST: CoachingFocus[] = ["Body Transformation", "Strength", "Nutrition", "Hybrid"];

const input =
  "w-full rounded-lg border border-white/[0.06] bg-ink-950/60 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30";
const label = "flex flex-col gap-1 text-[11px] font-medium text-zinc-500";

type State = "idle" | "saving" | "error";

export function AddLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [f, setF] = useState({
    name: "", email: "", phone: "", source: "Instagram", stage: "New" as LeadStage,
    estValue: "", goal: "", nextAction: "", consultDate: "",
  });
  const [interest, setInterest] = useState<CoachingFocus[]>([]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (x: CoachingFocus) =>
    setInterest((p) => (p.includes(x) ? p.filter((y) => y !== x) : [...p, x]));

  async function submit() {
    if (!f.name.trim() || state === "saving") return;
    setState("saving");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim() || undefined,
          phone: f.phone.trim() || undefined,
          source: f.source,
          status: f.stage,
          estValue: f.estValue ? Number(f.estValue) : undefined,
          interest,
          goal: f.goal.trim() || undefined,
          nextAction: f.nextAction.trim() || undefined,
          consultDate: f.consultDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setF((p) => ({ ...p, name: "", email: "", phone: "", estValue: "", goal: "", nextAction: "", consultDate: "" }));
      setInterest([]);
      setState("idle");
      setOpen(false);
      router.refresh();
    } catch {
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blood-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blood-600"
      >
        <UserPlus className="h-4 w-4" /> Add lead
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">New lead</span>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>Name *<input className={input} value={f.name} onChange={set("name")} placeholder="Full name" /></label>
        <label className={label}>Email<input className={input} value={f.email} onChange={set("email")} inputMode="email" /></label>
        <label className={label}>Phone<input className={input} value={f.phone} onChange={set("phone")} inputMode="tel" /></label>
        <label className={label}>Source<select className={input} value={f.source} onChange={set("source")}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className={label}>Stage<select className={input} value={f.stage} onChange={set("stage")}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className={label}>Est. value ($)<input className={input} value={f.estValue} onChange={set("estValue")} inputMode="decimal" /></label>
        <label className={label}>Goal<input className={input} value={f.goal} onChange={set("goal")} placeholder="What they want" /></label>
        <label className={label}>Next action<input className={input} value={f.nextAction} onChange={set("nextAction")} placeholder="e.g. Reply to DM" /></label>
        <label className={label}>Consult date<input type="date" className={input} value={f.consultDate} onChange={set("consultDate")} /></label>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Interest</div>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST.map((x) => (
            <button key={x} onClick={() => toggle(x)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${interest.includes(x) ? "bg-blood-500 text-white" : "border border-white/10 text-zinc-400 hover:text-white"}`}>{x}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={submit} disabled={!f.name.trim() || state === "saving"} className="inline-flex items-center gap-1.5 rounded-lg bg-blood-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blood-600 disabled:opacity-40">
          {state === "saving" ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create lead"}
        </button>
        {state === "error" && <span className="text-xs text-blood-400">Unable to sync — retry</span>}
      </div>
    </div>
  );
}
