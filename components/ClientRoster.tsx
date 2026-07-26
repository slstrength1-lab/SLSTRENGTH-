import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Client } from "@/lib/types";
import { Avatar, ProgressBar, Pill } from "./primitives";
import { riskClasses, relativeDate, currency } from "@/lib/format";

/** Sortable roster; risk order Red → Yellow → Green so at-risk float up. */
const riskRank: Record<string, number> = { Red: 0, Yellow: 1, Green: 2 };

export function ClientRoster({ clients }: { clients: Client[] }) {
  const sorted = [...clients].sort(
    (a, b) => riskRank[a.riskLevel] - riskRank[b.riskLevel] || a.compliance - b.compliance,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <th className="py-2.5 pr-4 font-semibold">Client</th>
            <th className="py-2.5 pr-4 font-semibold">Risk</th>
            <th className="py-2.5 pr-4 font-semibold">Phase</th>
            <th className="py-2.5 pr-4 font-semibold">Compliance</th>
            <th className="py-2.5 pr-4 font-semibold">Last check-in</th>
            <th className="py-2.5 pr-4 text-right font-semibold">MRR</th>
            <th className="py-2.5 w-6 font-semibold" aria-label="Open" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {sorted.map((c) => (
            <tr key={c.id} className="group cursor-pointer transition-colors hover:bg-white/[0.03]">
              <td className="py-3 pr-4">
                <Link
                  href={`/coach/clients/${c.id}`}
                  className="flex items-center gap-3"
                  aria-label={`View ${c.name}`}
                >
                  <Avatar initials={c.avatarInitials} size="sm" />
                  <div>
                    <div className="font-semibold text-white group-hover:text-blood-400">{c.name}</div>
                    <div className="text-xs text-zinc-500">{c.coachingFocus.join(" · ")}</div>
                  </div>
                </Link>
              </td>
              <td className="py-3 pr-4">
                <Pill className={riskClasses(c.riskLevel)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {c.riskLevel}
                </Pill>
              </td>
              <td className="py-3 pr-4 text-zinc-300">
                {c.currentPhase}
                <span className="ml-1 text-xs text-zinc-600">· {c.status}</span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <ProgressBar value={c.compliance} className="w-24" />
                  <span className="w-9 text-xs font-medium text-zinc-300">{c.compliance}%</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-zinc-400">{relativeDate(c.lastCheckIn)}</td>
              <td className="py-3 pr-4 text-right font-medium text-zinc-200">{currency(c.monthlyRate)}</td>
              <td className="py-3 text-right">
                <Link
                  href={`/coach/clients/${c.id}`}
                  className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={`View ${c.name}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
