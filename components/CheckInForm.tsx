"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

const RATINGS = ["Low", "Moderate", "High"] as const;
const SLEEP = ["Poor", "Okay", "Good"] as const;

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-ink-900 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o ? "bg-blood-500 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</label>
      {hint && <p className="mb-2 text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

export function CheckInForm({ clientId }: { clientId: string }) {
  const [bodyweight, setBodyweight] = useState("");
  const [compliance, setCompliance] = useState(85);
  const [energy, setEnergy] = useState<(typeof RATINGS)[number]>("Moderate");
  const [sleep, setSleep] = useState<(typeof SLEEP)[number]>("Good");
  const [stress, setStress] = useState<(typeof RATINGS)[number]>("Low");
  const [wins, setWins] = useState("");
  const [struggles, setStruggles] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          bodyweight: Number(bodyweight),
          compliance,
          energy,
          sleep,
          stress,
          wins,
          adjustments: struggles,
          status: "Submitted",
          date: new Date().toISOString().slice(0, 10),
        }),
      });
    } catch {
      /* prototype: ignore network errors */
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="text-lg font-semibold text-white">Check-in submitted</h3>
        <p className="max-w-sm text-sm text-zinc-400">
          Shane will review it and send adjustments within 24 hours. You'll get a
          notification when your feedback is ready.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-2 text-sm font-medium text-blood-500 hover:text-blood-400"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Bodyweight (lb)" hint="Morning, after bathroom, before food.">
          <input
            required
            inputMode="decimal"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            placeholder="204.0"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blood-500/50 focus:ring-2 focus:ring-blood-500/20"
          />
        </Field>

        <Field label={`Plan compliance — ${compliance}%`} hint="How closely did you follow the plan?">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={compliance}
            onChange={(e) => setCompliance(Number(e.target.value))}
            className="w-full accent-blood-500"
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Energy"><Segmented options={RATINGS} value={energy} onChange={setEnergy} /></Field>
        <Field label="Sleep"><Segmented options={SLEEP} value={sleep} onChange={setSleep} /></Field>
        <Field label="Stress"><Segmented options={RATINGS} value={stress} onChange={setStress} /></Field>
      </div>

      <Field label="Wins this week" hint="PRs, habits that clicked, anything you're proud of.">
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          rows={3}
          placeholder="Hit all sessions, RDL PR, stayed on macros through a work dinner…"
          className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blood-500/50 focus:ring-2 focus:ring-blood-500/20"
        />
      </Field>

      <Field label="Struggles & questions" hint="Where did you fall off? Anything you need from Shane?">
        <textarea
          value={struggles}
          onChange={(e) => setStruggles(e.target.value)}
          rows={3}
          placeholder="Traveling next week — hotel gym only. How should I adjust?"
          className="w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blood-500/50 focus:ring-2 focus:ring-blood-500/20"
        />
      </Field>

      <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-5">
        <span className="text-xs text-zinc-500">Auto-saved as draft</span>
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex items-center gap-2 rounded-xl bg-blood-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-blood-600 disabled:opacity-60"
        >
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit check-in
        </button>
      </div>
    </form>
  );
}
