import { Dumbbell, Clock, Repeat, ChevronDown } from "lucide-react";
import type { ProgramWeek } from "@/lib/types";

/**
 * Read-only weekly training structure for the coach client-detail view.
 *
 * Pure/server-renderable (native <details> for week collapse — no client JS).
 * It renders exactly what it is given: whatever weeks/days/exercises exist on
 * the program. When Notion has no structured plan (the plan lives in the linked
 * program sheet), `weeks` is empty and the caller shows an empty state instead —
 * nothing is fabricated here.
 */
export function ProgramStructure({ weeks }: { weeks: ProgramWeek[] }) {
  if (!weeks.length) return null;

  const totalSessions = weeks.reduce((n, w) => n + w.days.length, 0);

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        Weekly structure · {weeks.length} week{weeks.length === 1 ? "" : "s"} ·{" "}
        {totalSessions} session{totalSessions === 1 ? "" : "s"}
      </div>

      {weeks.map((week, wi) => (
        <details
          key={week.week}
          open={wi === 0}
          className="group/week overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900/50"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <span>{week.label || `Week ${week.week}`}</span>
            <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open/week:rotate-180" />
          </summary>

          <div className="space-y-3 border-t border-white/[0.06] p-3">
            {week.days.map((day) => (
              <div key={day.day} className="rounded-lg bg-ink-850/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blood-500/10 text-blood-500 ring-1 ring-inset ring-blood-500/25">
                    <Dumbbell className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{day.day}</div>
                    {day.focus && <div className="text-xs text-zinc-500">{day.focus}</div>}
                  </div>
                </div>

                {day.exercises.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-600">
                          <th className="py-1.5 pr-3 font-semibold">Exercise</th>
                          <th className="py-1.5 pr-3 font-semibold">Sets</th>
                          <th className="py-1.5 pr-3 font-semibold">Reps</th>
                          <th className="py-1.5 pr-3 font-semibold">Load</th>
                          <th className="py-1.5 pr-3 font-semibold">Rest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {day.exercises.map((ex) => (
                          <tr key={ex.name} className="text-zinc-300">
                            <td className="py-2 pr-3">
                              <div className="font-medium text-white">{ex.name}</div>
                              {(ex.tempo || ex.notes) && (
                                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                                  {ex.tempo && (
                                    <span className="inline-flex items-center gap-1">
                                      <Repeat className="h-3 w-3" /> Tempo {ex.tempo}
                                    </span>
                                  )}
                                  {ex.notes && <span className="text-blood-400">{ex.notes}</span>}
                                </div>
                              )}
                            </td>
                            <td className="py-2 pr-3">{ex.sets}</td>
                            <td className="py-2 pr-3">{ex.reps}</td>
                            <td className="py-2 pr-3">{ex.load}</td>
                            <td className="py-2 pr-3">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3 text-zinc-600" />
                                {ex.rest}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No exercises listed for this session.</p>
                )}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
