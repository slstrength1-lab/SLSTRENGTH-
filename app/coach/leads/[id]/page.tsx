import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Target,
  Mail,
  Phone,
  DollarSign,
  Percent,
  TrendingUp,
  CalendarClock,
  GitBranch,
  NotebookPen,
} from "lucide-react";
import type { LeadStage } from "@/lib/types";
import { getLeadById, coachNotesForLead } from "@/lib/store";
import * as analytics from "@/lib/analytics";
import { Card, PageHeader, SectionTitle, Pill, Avatar } from "@/components/primitives";
import { LeadPipelineControl } from "@/components/LeadPipelineControl";
import { CoachNotes } from "@/components/CoachNotes";
import { currency, longDate, relativeDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const notes = await coachNotesForLead(id);
  const expected = analytics.leads.expectedRevenue(lead);
  const prob = typeof lead.closeProbability === "number" ? lead.closeProbability : null;

  return (
    <div className="space-y-6">
      <Link href="/coach/leads" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      {/* ---- Lead header ---- */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar initials={initials(lead.name)} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{lead.name}</h1>
                <Pill className={stageStyle[lead.stage]}>{analytics.leads.stageLabel(lead.stage)}</Pill>
              </div>
              {lead.goal && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-300">
                  <Target className="h-4 w-4 text-blood-500" />
                  {lead.goal}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>Source: {lead.source || "—"}</span>
                {lead.assignedCoach && <span>Coach: {lead.assignedCoach}</span>}
                {lead.email && (
                  <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
                )}
                {lead.phone && (
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{currency(lead.estValue)}</div>
            <div className="text-xs text-zinc-500">estimated value</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Left column ---- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pipeline status */}
          <Card className="p-5">
            <SectionTitle right={<Pill className={stageStyle[lead.stage]}>{analytics.leads.stageLabel(lead.stage)}</Pill>}>
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-blood-500" /> Pipeline status
              </span>
            </SectionTitle>
            <LeadPipelineControl leadId={lead.id} stage={lead.stage} />
            <p className="mt-2 text-[11px] text-zinc-600">
              Moving a lead to “Won” triggers the existing client conversion.
            </p>
          </Card>

          {/* Activity timeline / Coach notes (reuses Coach Notes, Lead relation) */}
          <Card className="p-5">
            <SectionTitle right={notes.length ? <span className="text-xs text-zinc-500">{notes.length}</span> : undefined}>
              <span className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-blood-500" /> Coach notes &amp; activity
              </span>
            </SectionTitle>
            <CoachNotes leadId={lead.id} author="Shane Lanteigne" initialNotes={notes} />
            <p className="mt-3 text-[11px] text-zinc-600">
              Notes attach to this lead via the Coach Notes database. Stage-change history isn&apos;t stored yet.
            </p>
          </Card>
        </div>

        {/* ---- Right column ---- */}
        <div className="space-y-6">
          {/* Consultation */}
          <Card className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blood-500" /> Consultation
              </span>
            </SectionTitle>
            <dl className="space-y-2.5 text-sm">
              <Row label="Consult date" value={lead.consultDate ? `${longDate(lead.consultDate)} · ${relativeDate(lead.consultDate)}` : "Not scheduled"} />
              <Row label="Next follow-up" value={lead.nextFollowUp ? `${longDate(lead.nextFollowUp)} · ${relativeDate(lead.nextFollowUp)}` : "—"} />
              <Row label="Next action" value={lead.nextAction || "—"} />
              <Row label="Last contact" value={lead.lastContact ? relativeDate(lead.lastContact) : "—"} />
            </dl>
          </Card>

          {/* Revenue opportunity */}
          <Card className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blood-500" /> Revenue opportunity
              </span>
            </SectionTitle>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Tile icon={<DollarSign className="h-3.5 w-3.5" />} label="Est. value" value={currency(lead.estValue)} />
              <Tile icon={<Percent className="h-3.5 w-3.5" />} label="Close prob." value={prob === null ? "—" : `${prob}%`} />
              <Tile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Expected" value={currency(expected)} accent />
            </div>
            {prob === null && (
              <p className="mt-2 text-[11px] text-zinc-600">Set a close probability to forecast expected revenue.</p>
            )}
          </Card>

          {/* Profile */}
          <Card className="p-5">
            <SectionTitle>Lead information</SectionTitle>
            <dl className="space-y-2.5 text-sm">
              <Row label="Email" value={lead.email || "—"} />
              <Row label="Phone" value={lead.phone || "—"} />
              <Row label="Source" value={lead.source || "—"} />
              <Row label="Interest" value={lead.interest.length ? lead.interest.join(", ") : "—"} />
              <Row label="Problem" value={lead.problem || "—"} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

function Tile({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg bg-ink-850/60 p-2.5 ${accent ? "ring-1 ring-inset ring-blood-500/30" : ""}`}>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-zinc-600">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}
