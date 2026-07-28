import { Users2 } from "lucide-react";
import type { LeadSummary } from "@/lib/analytics/leads";
import { Card, SectionTitle, Pill } from "./primitives";
import { currency, pct } from "@/lib/format";

/**
 * CRM — live pipeline summary for the Business-OS grid. Consumes the pure lead
 * analytics (summarizeLeads); no Notion access, no business logic in JSX — it
 * only formats already-computed values. Expected revenue is 0 until Close
 * Probability is filled, so nothing here is fabricated.
 */
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-850/60 p-2.5">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${accent ? "text-blood-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Action({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-900/60 p-2.5 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">{label}</div>
    </div>
  );
}

export function CRMCard({ leads }: { leads: LeadSummary }) {
  const closeRate = leads.closeRate === null ? "—" : pct(leads.closeRate * 100);

  return (
    <Card className="p-5">
      <SectionTitle right={<Pill className="bg-emerald-500/15 text-emerald-400 ring-emerald-500/25">Live</Pill>}>
        <span className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-blood-500" /> CRM
        </span>
      </SectionTitle>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Active leads" value={String(leads.activeLeads)} />
        <Metric label="Pipeline value" value={currency(leads.totalPipelineValue)} />
        <Metric label="Expected revenue" value={currency(leads.weightedPipelineValue)} accent />
        <Metric label="Close rate" value={closeRate} />
      </div>

      {/* Action metrics */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Action label="Follow-up due" value={leads.needsFollowUp} />
        <Action label="Consults today" value={leads.consultsToday} />
        <Action label="Consults tmrw" value={leads.consultsTomorrow} />
        <Action label="New this month" value={leads.leadsThisMonth} />
      </div>
    </Card>
  );
}
