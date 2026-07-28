"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { LeadStage } from "@/lib/types";
import { STAGE_ORDER, stageLabel } from "@/lib/analytics/leads";

/**
 * Pipeline Status control for the Lead Command Center. Updates the lead's stage
 * through the existing PATCH /api/leads/:id (UI → API → notion → Notion) — the
 * conversion logic is untouched, so moving a lead to "Closed Won" still triggers
 * the existing client creation. A confirm guards that one transition.
 */
type State = "idle" | "saving" | "saved" | "error";

export function LeadPipelineControl({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const router = useRouter();
  const [current, setCurrent] = useState<LeadStage>(stage);
  const [state, setState] = useState<State>("idle");

  async function setStage(next: LeadStage) {
    if (next === current || state === "saving") return;
    if (next === "Closed Won" && !confirm("Mark this lead Won? This triggers the existing client conversion.")) return;
    setState("saving");
    const prev = current;
    setCurrent(next); // optimistic
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setCurrent(prev); // revert
      setState("error");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {STAGE_ORDER.map((s) => {
          const active = s === current;
          return (
            <button
              key={s}
              onClick={() => setStage(s)}
              disabled={state === "saving"}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                active
                  ? "bg-blood-500 text-white"
                  : "border border-white/10 text-zinc-400 hover:border-blood-500/40 hover:text-white"
              }`}
            >
              {stageLabel(s)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 h-4 text-[11px]">
        {state === "saving" && (
          <span className="flex items-center gap-1 text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Updating stage…
          </span>
        )}
        {state === "saved" && <span className="text-emerald-400">Stage updated</span>}
        {state === "error" && <span className="text-blood-400">Unable to sync — retry</span>}
      </div>
    </div>
  );
}
