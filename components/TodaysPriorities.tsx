import Link from "next/link";
import { ListChecks, ChevronRight } from "lucide-react";
import type { OwnerSummary, PriorityTone } from "@/lib/types";
import { Card, SectionTitle, Avatar, EmptyState } from "./primitives";

/**
 * Today's Priorities — auto-generated cross-client action lists from live data
 * (store.summarizePortfolio). Only non-empty groups render; each item links to
 * the client. No fabricated reminders.
 */
const toneStyle: Record<PriorityTone, string> = {
  red: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  sky: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
};

export function TodaysPriorities({ summary }: { summary: OwnerSummary }) {
  const groups = summary.priorities;
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Card className="p-5">
      <SectionTitle right={<span className="text-xs text-zinc-500">{total} to review</span>}>
        <span className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-blood-500" /> Today&apos;s priorities
        </span>
      </SectionTitle>

      {groups.length === 0 ? (
        <EmptyState title="Nothing needs attention today." hint="Every client is on track. 🔥" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.key} className="rounded-xl bg-ink-850/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">{g.label}</span>
                <span className={`pill ${toneStyle[g.tone]}`}>{g.items.length}</span>
              </div>
              <ul className="space-y-1.5">
                {g.items.slice(0, 5).map((it) => (
                  <li key={`${g.key}_${it.clientId}`}>
                    <Link
                      href={`/coach/clients/${it.clientId}`}
                      className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5"
                    >
                      <Avatar initials={it.initials} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{it.name}</span>
                        <span className="block truncate text-[11px] text-zinc-500">{it.detail}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-blood-500" />
                    </Link>
                  </li>
                ))}
                {g.items.length > 5 && (
                  <li className="px-1.5 pt-1 text-[11px] text-zinc-600">+{g.items.length - 5} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
