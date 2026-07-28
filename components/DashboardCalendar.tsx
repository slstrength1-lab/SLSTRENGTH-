import { CalendarDays } from "lucide-react";
import type { OwnerSummary, CalendarEventType } from "@/lib/types";
import { Card, SectionTitle, Pill, EmptyState } from "./primitives";
import { longDate, relativeDate } from "@/lib/format";

/**
 * Dashboard Calendar — a lean next-N-days agenda assembled from live dates
 * (check-ins due, consultations, payments, renewals, program start/end, and
 * client birthdays from the Clients.Birthday field). Grouped by day.
 */
const typeStyle: Record<CalendarEventType, string> = {
  "Check-in": "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Consultation: "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  Payment: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Renewal: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  "Program Start": "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  "Program End": "bg-white/5 text-zinc-400 ring-white/10",
  Birthday: "bg-pink-500/15 text-pink-400 ring-pink-500/25",
};

export function DashboardCalendar({ summary }: { summary: OwnerSummary }) {
  const events = summary.calendar;
  // Group by day (already sorted ascending in the store).
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const arr = byDay.get(e.date) ?? [];
    arr.push(e);
    byDay.set(e.date, arr);
  }

  return (
    <Card className="p-5">
      <SectionTitle right={<span className="text-xs text-zinc-500">next 14 days</span>}>
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blood-500" /> Calendar
        </span>
      </SectionTitle>

      {events.length === 0 ? (
        <EmptyState title="Nothing scheduled in the next two weeks." />
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day} className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <div className="text-sm font-semibold text-zinc-300">
                {longDate(day)}
                <span className="ml-2 text-[11px] font-normal text-zinc-600">{relativeDate(day)}</span>
              </div>
              <ul className="space-y-1.5">
                {items.map((e, i) => (
                  <li key={`${day}_${i}`} className="flex items-center gap-2 rounded-lg bg-ink-850/60 px-3 py-2 text-sm">
                    <Pill className={typeStyle[e.type]}>{e.type}</Pill>
                    <span className="min-w-0 flex-1 truncate text-zinc-200">{e.label}</span>
                    {e.detail && <span className="shrink-0 truncate text-[11px] text-zinc-500">{e.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
