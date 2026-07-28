import { TrendingUp, UserPlus, UserMinus, Percent, DoorOpen } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { Card, SectionTitle } from "./primitives";
import { LineChart } from "./LineChart";

/**
 * Growth — new vs lost clients, lead→client conversion, remaining capacity, and
 * the 6-month active-client trend. All from lib/analytics.
 */
function Metric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-xl bg-ink-850/60 p-4">
      <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export function GrowthSection({ summary: s }: { summary: OwnerSummary }) {
  const growth = s.clientGrowthTrend.map((m) => ({ x: m.month, y: m.count }));
  const conversion = s.conversionRate === null ? "—" : `${Math.round(s.conversionRate * 100)}%`;

  return (
    <Card className="p-5">
      <SectionTitle>
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blood-500" /> Growth
        </span>
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="New this month" value={String(s.newClientsThisMonth)} icon={<UserPlus className="h-3.5 w-3.5" />} tone="text-emerald-400" />
          <Metric label="Lost this month" value={String(s.lostThisMonth)} icon={<UserMinus className="h-3.5 w-3.5" />} tone="text-blood-400" />
          <Metric label="Conversion" value={conversion} icon={<Percent className="h-3.5 w-3.5" />} tone="text-sky-400" />
          <Metric label="Capacity left" value={String(s.capacityRemaining)} icon={<DoorOpen className="h-3.5 w-3.5" />} tone="text-amber-400" />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Active clients · 6 months</div>
          <LineChart series={{ points: growth, color: "#38bdf8" }} height={150} yLabel="Clients" />
        </div>
      </div>
    </Card>
  );
}
