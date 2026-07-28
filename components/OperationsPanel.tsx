import Link from "next/link";
import { Activity, DollarSign, ClipboardCheck, StickyNote, UserPlus, Sparkles } from "lucide-react";
import type { OwnerSummary, ActivityType } from "@/lib/types";
import { Card, SectionTitle, EmptyState } from "./primitives";
import { relativeDate } from "@/lib/format";

/**
 * Operations — throughput counts across the delivery machine plus a merged,
 * time-sorted Recent Activity feed (payments · check-ins · notes · new clients).
 * All data-driven from store.summarizePortfolio.
 */
const activityIcon: Record<ActivityType, typeof DollarSign> = {
  payment: DollarSign,
  checkin: ClipboardCheck,
  note: StickyNote,
  client: UserPlus,
};
const activityColor: Record<ActivityType, string> = {
  payment: "text-emerald-400",
  checkin: "text-sky-400",
  note: "text-amber-400",
  client: "text-blood-400",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ink-850/60 p-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

export function OperationsPanel({ summary }: { summary: OwnerSummary }) {
  const s = summary;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blood-500" /> Operations
          </span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Programs active" value={s.programsActive} />
          <Stat label="Programs ending" value={s.programsEnding} />
          <Stat label="Pending notes" value={s.pendingNotes} />
          <Stat label="Open AI recs" value={s.openAiRecs} />
          <Stat label="Nutrition plans" value={s.nutritionPlans} />
          <Stat label="Check-ins reviewed" value={s.completedCheckIns} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle right={<Activity className="h-3.5 w-3.5 text-zinc-500" />}>Recent activity</SectionTitle>
        {s.activity.length ? (
          <ul className="space-y-2">
            {s.activity.map((a) => {
              const Icon = activityIcon[a.type];
              const row = (
                <span className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${activityColor[a.type]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-200">{a.title}</span>
                    {a.detail && <span className="block truncate text-[11px] text-zinc-500">{a.detail}</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-600">{a.date ? relativeDate(a.date) : ""}</span>
                </span>
              );
              return (
                <li key={a.id} className="rounded-xl bg-ink-850/60 p-2.5">
                  {a.clientId ? (
                    <Link href={`/coach/clients/${a.clientId}`} className="block transition-colors hover:opacity-80">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No recent activity." />
        )}
      </Card>
    </div>
  );
}
