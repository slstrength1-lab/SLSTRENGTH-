import Link from "next/link";
import { Inbox, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { getRecommendations, recommendationsReadError } from "@/lib/store";
import * as analytics from "@/lib/analytics";
import { PageHeader, StatCard } from "@/components/primitives";
import { ApprovalInbox } from "@/components/ApprovalInbox";
import { RunAgentButton } from "@/components/RunAgentButton";

export const dynamic = "force-dynamic";

/**
 * Approval inbox (Phase 0 backbone) — every AI proposal lands here for the coach
 * to edit, approve (which executes it), reject, or dismiss. Summary metrics come
 * from the recommendation analytics layer. UI → analytics ← store → notion.
 */
export default async function ApprovalsPage() {
  const recs = await getRecommendations();
  const s = analytics.recommendations.summarizeRecommendations(recs);
  const ordered = analytics.recommendations.inboxOrder(recs);
  const readError = recs.length === 0 ? recommendationsReadError() : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI · Human-in-the-loop"
        title="Approvals"
        subtitle="Everything the AI proposes waits here for your call. Nothing reaches a client until you approve it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RunAgentButton agent="briefing" label="Generate briefing" />
            <RunAgentButton agent="growth" label="Content ideas" />
            <Link href="/coach" className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-400 hover:text-white">
              ← Dashboard
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={s.pending} icon={<Clock className="h-4 w-4" />} sub={`${s.total} total`} accent />
        <StatCard label="Needs your review" value={s.needsReview} icon={<ShieldAlert className="h-4 w-4" />} sub="review + manual tier" />
        <StatCard label="Applied" value={s.applied} icon={<CheckCircle2 className="h-4 w-4" />} sub="executed into records" />
        <StatCard label="Rejected" value={s.rejected} icon={<Inbox className="h-4 w-4" />} />
      </div>

      {readError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <span className="font-semibold">Couldn&apos;t read the AI Recommendations database:</span> {readError}
        </div>
      )}

      <ApprovalInbox recommendations={ordered} />
    </div>
  );
}
