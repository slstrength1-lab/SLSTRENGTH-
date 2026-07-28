import Link from "next/link";
import {
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Users2,
  Megaphone,
  Bot,
  Banknote,
  Cog,
  DollarSign,
  ClipboardCheck,
} from "lucide-react";
import type { OwnerSummary, ContentItem, ActivityItem, ActivityType } from "@/lib/types";
import type { LeadSummary } from "@/lib/analytics/leads";
import { Card, SectionTitle, Pill, EmptyState } from "./primitives";
import { CRMCard } from "./CRMCard";
import { shortDate, relativeDate } from "@/lib/format";

/**
 * Business Operating System grid — the surface everything eventually flows
 * through. Each module is either LIVE (backed by an existing database) or a
 * design-only PLACEHOLDER that "plugs in" later by pointing at a lib/analytics
 * function — no dashboard surgery required. Content and Operations are live
 * today (Content DB · Programs/Notes/Check-ins); the rest are future stubs.
 */

const activityIcon: Record<ActivityType, typeof DollarSign> = {
  payment: DollarSign,
  checkin: ClipboardCheck,
  note: Sparkles,
  client: Users2,
};

function Stub({ title, icon, examples }: { title: string; icon: React.ReactNode; examples: string[] }) {
  return (
    <Card className="p-5">
      <SectionTitle right={<Pill className="bg-white/5 text-zinc-500 ring-white/10">Coming soon</Pill>}>
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </SectionTitle>
      <ul className="space-y-1.5">
        {examples.map((ex, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-lg border border-dashed border-white/[0.08] bg-ink-850/40 px-3 py-2 text-xs text-zinc-500"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700" />
            {ex}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ContentCard({ items }: { items: ContentItem[] }) {
  return (
    <Card className="p-5">
      <SectionTitle right={<Pill className="bg-emerald-500/15 text-emerald-400 ring-emerald-500/25">Live</Pill>}>
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blood-500" /> Content calendar
        </span>
      </SectionTitle>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((c) => (
            <li key={c.id} className="rounded-lg bg-ink-850/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-white">{c.title}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">{c.publishDate ? shortDate(c.publishDate) : "—"}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-600">
                <Pill className="bg-white/5 text-zinc-400 ring-white/10">{c.status}</Pill>
                <span>{c.format}</span>
                {c.platform.length > 0 && <span>· {c.platform.join(", ")}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No content scheduled." />
      )}
    </Card>
  );
}

function OperationsCard({ summary: s }: { summary: OwnerSummary }) {
  const counts: [string, number][] = [
    ["Programs active", s.programsActive],
    ["Programs ending", s.programsEnding],
    ["Pending notes", s.pendingNotes],
    ["Open AI recs", s.openAiRecs],
    ["Nutrition plans", s.nutritionPlans],
    ["Check-ins reviewed", s.completedCheckIns],
  ];
  return (
    <Card className="p-5">
      <SectionTitle right={<Pill className="bg-emerald-500/15 text-emerald-400 ring-emerald-500/25">Live</Pill>}>
        <span className="flex items-center gap-2">
          <Cog className="h-4 w-4 text-blood-500" /> Operations
        </span>
      </SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-ink-850/60 p-2.5 text-center">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">{label}</div>
          </div>
        ))}
      </div>
      {s.activity.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.activity.slice(0, 4).map((a: ActivityItem) => {
            const Icon = activityIcon[a.type];
            const row = (
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{a.detail || a.title}</span>
                <span className="shrink-0 text-[10px] text-zinc-600">{a.date ? relativeDate(a.date) : ""}</span>
              </span>
            );
            return (
              <li key={a.id}>
                {a.clientId && !a.clientId.startsWith("lead_") ? (
                  <Link href={`/coach/clients/${a.clientId}`} className="block hover:opacity-80">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function OSGrid({
  summary,
  content,
  leads,
}: {
  summary: OwnerSummary;
  content: ContentItem[];
  leads: LeadSummary;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <LayoutGrid className="h-4 w-4 text-blood-500" /> Business Operating System
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CRMCard leads={leads} />
        <ContentCard items={content} />
        <OperationsCard summary={summary} />
        <Stub
          title="AI Business Advisor"
          icon={<Bot className="h-4 w-4 text-blood-500" />}
          examples={["Revenue is down 8% vs last month", "3 clients at risk of churn", "Highest-value client hasn't checked in"]}
        />
        <Stub
          title="Marketing"
          icon={<Megaphone className="h-4 w-4 text-blood-500" />}
          examples={["Campaign performance", "Ad spend & ROAS", "Email / social reach"]}
        />
        <Stub
          title="Automations"
          icon={<Sparkles className="h-4 w-4 text-blood-500" />}
          examples={["Renewal reminders", "Check-in nudges", "Onboarding sequences"]}
        />
        <Stub
          title="Financial Dashboard"
          icon={<Banknote className="h-4 w-4 text-blood-500" />}
          examples={["Profit & loss", "Expenses & margins", "Tax set-aside"]}
        />
      </div>
    </div>
  );
}
