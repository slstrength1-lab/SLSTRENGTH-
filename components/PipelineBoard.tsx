import type { Lead, LeadStage } from "@/lib/types";
import { currency, shortDate } from "@/lib/format";

const STAGES: { key: LeadStage; accent: string }[] = [
  { key: "New", accent: "text-zinc-400" },
  { key: "Contacted", accent: "text-sky-400" },
  { key: "Qualified", accent: "text-violet-400" },
  { key: "Call Scheduled", accent: "text-amber-400" },
  { key: "Offer Presented", accent: "text-orange-400" },
  { key: "Closed Won", accent: "text-emerald-400" },
  { key: "Nurture", accent: "text-pink-400" },
];

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-3">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.key);
          const value = items.reduce((s, l) => s + l.estValue, 0);
          return (
            <div key={stage.key} className="flex w-64 shrink-0 flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${stage.accent}`}>
                  {stage.key}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                  {items.length}
                </span>
              </div>
              <div className="mb-2 px-1 text-[11px] text-zinc-600">{currency(value)} in stage</div>
              <div className="space-y-2">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className="card card-hover cursor-default rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{l.name}</span>
                      <span className="text-xs font-medium text-blood-400">{currency(l.estValue)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{l.nextAction}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>{l.source}</span>
                      <span>{shortDate(l.nextFollowUp)}</span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/[0.08] py-6 text-center text-[11px] text-zinc-600">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
