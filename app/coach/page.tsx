import { Sparkles, Bot } from "lucide-react";
import { getOwnerData, summarizePortfolio } from "@/lib/store";
import { getOwnerConfig } from "@/lib/config";
import { PageHeader, Card, SectionTitle } from "@/components/primitives";
import { OwnerOverview } from "@/components/OwnerOverview";
import { TodaysPriorities } from "@/components/TodaysPriorities";
import { BusinessHealth } from "@/components/BusinessHealth";
import { OperationsPanel } from "@/components/OperationsPanel";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { PlaceholderCard } from "@/components/PlaceholderCard";
import { PipelineBoard } from "@/components/PipelineBoard";
import { currency, longDate } from "@/lib/format";

/**
 * Owner (CEO) Dashboard — the post-login homepage. Answers "How is my business
 * doing today?" in one scroll. Every figure comes from the live databases via
 * store.summarizePortfolio (UI → store.ts → notion.ts → Notion). AI Insights and
 * Automation are design-only placeholders until those engines exist.
 */
export default async function CoachPage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getOwnerData();
  const summary = summarizePortfolio(data, getOwnerConfig(), today);

  const openLeads = data.leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Nurture");
  const pipelineValue = openLeads.reduce((s, l) => s + l.estValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Command Center"
        title="Owner Dashboard"
        subtitle="How is the business doing today?"
        actions={
          <span className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-400">
            {longDate(today)}
          </span>
        }
      />

      {/* 1 — Business Overview */}
      <OwnerOverview summary={summary} />

      {/* 2 — Today's Priorities */}
      <TodaysPriorities summary={summary} />

      {/* 3 — Business Health */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Business health</h2>
        <BusinessHealth summary={summary} />
      </div>

      {/* 4 — Operations */}
      <OperationsPanel summary={summary} />

      {/* 5 — Lead pipeline */}
      <Card className="p-5">
        <SectionTitle
          right={
            <span className="text-xs text-zinc-500">
              {currency(pipelineValue)} open · {openLeads.length} leads
            </span>
          }
        >
          Lead pipeline
        </SectionTitle>
        <PipelineBoard leads={data.leads} />
      </Card>

      {/* 6 — Calendar */}
      <DashboardCalendar summary={summary} />

      {/* 7 + 8 — AI Insights & Automation (design-only placeholders) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PlaceholderCard
          title="AI insights"
          icon={<Sparkles className="h-4 w-4 text-blood-500" />}
          note="When the AI engine is enabled, insights write to Coach Notes as AI Recommendations and surface here."
          examples={[
            "Revenue is down 8% vs last month",
            "3 clients are at risk of churning",
            "Average compliance increased this week",
            "Highest-value client hasn't checked in",
            "Most common coaching issue this week",
          ]}
        />
        <PlaceholderCard
          title="Automation status"
          icon={<Bot className="h-4 w-4 text-blood-500" />}
          note="Automations (renewal reminders, check-in nudges, onboarding sequences) will report their status here."
          examples={[
            "Renewal reminders — not connected",
            "Check-in nudges — not connected",
            "Onboarding sequence — not connected",
            "Payment retries — not connected",
          ]}
        />
      </div>
    </div>
  );
}
