"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Pencil, Loader2, ArchiveX, Sparkles } from "lucide-react";
import type { Recommendation, RiskTier, RecommendationStatus } from "@/lib/types";
import { Card, Pill } from "@/components/primitives";

/**
 * Approval inbox — the human-in-the-loop surface. Every AI proposal lands here;
 * the coach edits, approves (which executes it), rejects, or dismisses. Writes
 * go through PATCH /api/recommendations/:id → execution service. UI only.
 */
const riskStyle: Record<RiskTier, string> = {
  safe: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  review: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  manual: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
};
const riskLabel: Record<RiskTier, string> = {
  safe: "Safe",
  review: "Needs review",
  manual: "Manual only",
};
const statusStyle: Record<RecommendationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  approved: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  applied: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  rejected: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  dismissed: "bg-white/5 text-zinc-500 ring-white/10",
};

function RecCard({ rec }: { rec: Recommendation }) {
  const router = useRouter();
  const [draft, setDraft] = useState(rec.draft);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "approve" | "reject" | "dismiss" | "save">(null);
  const pending = rec.status === "pending";
  const who = rec.clientName || rec.leadName;

  async function act(action: "approve" | "reject" | "dismiss" | "edit", key: typeof busy) {
    setBusy(key);
    try {
      const res = await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, draft: action === "approve" || action === "edit" ? draft : undefined }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  return (
    <Card className={`p-4 ${pending ? "" : "opacity-70"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill className="bg-white/5 text-zinc-300 ring-white/10">
          <Sparkles className="mr-1 inline h-3 w-3 text-blood-500" />
          {rec.source}
        </Pill>
        <Pill className="bg-white/5 text-zinc-400 ring-white/10">{rec.kind}</Pill>
        <Pill className={riskStyle[rec.riskTier]}>{riskLabel[rec.riskTier]}</Pill>
        {who && <span className="text-xs text-zinc-500">· {who}</span>}
        {typeof rec.confidence === "number" && (
          <span className="text-xs text-zinc-600">· {rec.confidence}% conf.</span>
        )}
        {!pending && <Pill className={`ml-auto ${statusStyle[rec.status]}`}>{rec.status}</Pill>}
      </div>

      <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
      {rec.summary && <p className="mt-1 text-xs text-zinc-400">{rec.summary}</p>}

      {(rec.draft || editing) && (
        <div className="mt-3">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
            />
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-white/[0.05] bg-ink-950/40 px-3 py-2 text-sm text-zinc-300">
              {draft}
            </div>
          )}
        </div>
      )}

      {pending && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {rec.riskTier !== "manual" && (
            <button
              onClick={() => act("approve", "approve")}
              disabled={!!busy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve{rec.riskTier === "safe" ? "" : " & apply"}
            </button>
          )}
          {editing ? (
            <button
              onClick={() => act("edit", "save")}
              disabled={!!busy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white disabled:opacity-60"
            >
              {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save edit
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          <button
            onClick={() => act("reject", "reject")}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-blood-400 disabled:opacity-60"
          >
            {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Reject
          </button>
          <button
            onClick={() => act("dismiss", "dismiss")}
            disabled={!!busy}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 disabled:opacity-60"
            title="Dismiss (not relevant)"
          >
            <ArchiveX className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {rec.riskTier === "manual" && pending && (
        <p className="mt-2 text-[11px] text-blood-400/80">
          Manual-only — the AI prepared this for you; approve it yourself outside the system.
        </p>
      )}
    </Card>
  );
}

export function ApprovalInbox({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-zinc-500">No recommendations yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Your AI advisors will drop proposals here for review as they run.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {recommendations.map((r) => (
        <RecCard key={r.id} rec={r} />
      ))}
    </div>
  );
}
