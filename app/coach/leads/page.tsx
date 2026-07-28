import Link from "next/link";
import { Users2, DollarSign, TrendingUp, Percent } from "lucide-react";
import type { LeadStage } from "@/lib/types";
import { getLeads } from "@/lib/store";
import * as analytics from "@/lib/analytics";
import { PageHeader, Card, SectionTitle, StatCard, Pill } from "@/components/primitives";
import { PipelineBoard } from "@/components/PipelineBoard";
import { currency, pct, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Leads — the CRM list surface. Summary metrics come from the lead analytics
 * layer (no duplicated calculations); the table + clickable pipeline route into
 * each Lead Command Center. UI → analytics ← store → notion → Notion.
 */
const stageStyle: Record<LeadStage, string> = {
  New: "bg-white/5 text-zinc-300 ring-white/10",
  Contacted: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Qualified: "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  "Call Scheduled": "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  "Offer Presented": "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  "Closed Won": "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Nurture: "bg-pink-500/15 text-pink-400 ring-pink-500/25",
  Lost: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
};

export default async function LeadsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const leads = await getLeads();
  const s = analytics.leads.summarizeLeads(leads, today);
  // Newest activity first: active pipeline stages before won/lost/nurture.
  const ordered = [...leads].sort(
    (a, b) => analytics.leads.STAGE_ORDER.indexOf(a.stage) - analytics.leads.STAGE_ORDER.indexOf(b.stage),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        subtitle="Your sales pipeline — who's in it, what it's worth, and what to do next."
        actions={
          <Link href="/coach" className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-400 hover:text-white">
            ← Dashboard
          </Link>
        }
      />

      {/* Summary (from analytics/leads) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active leads" value={s.activeLeads} icon={<Users2 className="h-4 w-4" />} sub={`${s.totalLeads} total`} accent />
        <StatCard label="Pipeline value" value={currency(s.totalPipelineValue)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Expected revenue" value={currency(s.weightedPipelineValue)} icon={<TrendingUp className="h-4 w-4" />} sub="value × probability" />
        <StatCard label="Close rate" value={s.closeRate === null ? "—" : pct(s.closeRate * 100)} icon={<Percent className="h-4 w-4" />} sub={`${s.wonLeads} won · ${s.lostLeads} lost`} />
      </div>

      {/* Pipeline (clickable) */}
      <Card className="p-5">
        <SectionTitle right={<span className="text-xs text-zinc-500">{currency(s.totalPipelineValue)} · {s.activeLeads} active</span>}>
          Pipeline
        </SectionTitle>
        <PipelineBoard leads={leads} />
      </Card>

      {/* All leads table */}
      <Card className="p-5">
        <SectionTitle right={<span className="text-xs text-zinc-500">{leads.length}</span>}>All leads</SectionTitle>
        {leads.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-600">
                  <th className="py-2 pr-3 font-semibold">Lead</th>
                  <th className="py-2 pr-3 font-semibold">Stage</th>
                  <th className="py-2 pr-3 text-right font-semibold">Est. value</th>
                  <th className="py-2 pr-3 text-right font-semibold">Close %</th>
                  <th className="py-2 pr-3 text-right font-semibold">Expected</th>
                  <th className="py-2 pr-3 font-semibold">Next follow-up</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {ordered.map((l) => (
                  <tr key={l.id} className="text-zinc-300 transition-colors hover:bg-white/[0.02]">
                    <td className="py-2 pr-3">
                      <Link href={`/coach/leads/${l.id}`} className="font-medium text-white hover:text-blood-400">
                        {l.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <Pill className={stageStyle[l.stage]}>{analytics.leads.stageLabel(l.stage)}</Pill>
                    </td>
                    <td className="py-2 pr-3 text-right">{currency(l.estValue)}</td>
                    <td className="py-2 pr-3 text-right text-zinc-400">
                      {typeof l.closeProbability === "number" ? `${l.closeProbability}%` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-zinc-200">
                      {currency(analytics.leads.expectedRevenue(l))}
                    </td>
                    <td className="py-2 pr-3 text-zinc-400">{l.nextFollowUp ? shortDate(l.nextFollowUp) : "—"}</td>
                    <td className="py-2 pr-3 text-zinc-500">{l.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">No leads yet.</p>
        )}
      </Card>
    </div>
  );
}
