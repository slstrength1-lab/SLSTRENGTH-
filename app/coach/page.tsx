import { getOwnerData, summarizeOwner } from "@/lib/store";
import * as analytics from "@/lib/analytics";
import { getOwnerConfig } from "@/lib/config";
import { PageHeader, Card, SectionTitle } from "@/components/primitives";
import { BusinessSnapshot } from "@/components/BusinessSnapshot";
import { TodaysPriorities } from "@/components/TodaysPriorities";
import { BusinessHealth } from "@/components/BusinessHealth";
import { RevenueSection } from "@/components/RevenueSection";
import { GrowthSection } from "@/components/GrowthSection";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { OSGrid } from "@/components/OSGrid";
import { PipelineBoard } from "@/components/PipelineBoard";
import { currency, longDate } from "@/lib/format";

/**
 * Owner (CEO) Dashboard — the post-login control center. Answers "What does
 * Shane need to know and do today to run SL Strength?" Every figure comes from
 * the analytics layer (lib/analytics) over live data: UI → analytics ← store →
 * notion → Notion. Components never touch Notion or recompute business logic.
 */
export default async function CoachPage() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getOwnerData();
  const summary = summarizeOwner(data, getOwnerConfig(), today);
  const upcomingContent = analytics.content.upcomingContent(data);
  const leadSummary = analytics.leads.summarizeLeads(data.leads, today);

  const openLeads = data.leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Nurture");
  const pipelineValue = openLeads.reduce((s, l) => s + l.estValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner Command Center"
        title="Owner Dashboard"
        subtitle="What needs attention, how the money looks, and today's priorities."
        actions={
          <span className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-400">
            {longDate(today)}
          </span>
        }
      />

      {/* 1 — Business Snapshot */}
      <BusinessSnapshot summary={summary} />

      {/* 2 — Today's Priorities */}
      <TodaysPriorities summary={summary} />

      {/* 3 — Business Health */}
      <BusinessHealth summary={summary} />

      {/* 4 — Revenue */}
      <RevenueSection summary={summary} />

      {/* 5 — Growth */}
      <GrowthSection summary={summary} />

      {/* 6 — Upcoming */}
      <DashboardCalendar summary={summary} />

      {/* 7 — Lead pipeline (live) */}
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

      {/* 8 — Business Operating System (live + plug-in placeholders) */}
      <OSGrid summary={summary} content={upcomingContent} leads={leadSummary} />
    </div>
  );
}
