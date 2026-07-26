"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Client } from "@/lib/types";
import { Avatar, ProgressBar, Pill } from "./primitives";
import { riskClasses, relativeDate, currency } from "@/lib/format";

/** Sortable roster; risk order Red → Yellow → Green so at-risk float up. */
const riskRank: Record<string, number> = { Red: 0, Yellow: 1, Green: 2 };

export function ClientRoster({ clients }: { clients: Client[] }) {
  const router = useRouter();
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
          {sorted.map((c) => {
            const href = `/coach/clients/${c.id}`;
            const open = () => router.push(href);
            return (
              // Whole row is clickable; the name stays a real <Link> so
              // right-click / open-in-new-tab / screen readers keep working.
              <tr
                key={c.id}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`View ${c.name}`}
                className="group cursor-pointer transition-colors hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blood-500/40"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.avatarInitials} size="sm" />
                    <div>
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-white group-hover:text-blood-400"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-zinc-500">{c.coachingFocus.join(" · ")}</div>
                    </div>
                  </div>
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
                  <span className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-600 transition-colors group-hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
