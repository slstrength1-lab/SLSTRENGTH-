import { DollarSign, TrendingUp, Users, UserPlus, Target, Repeat, Gauge, AlertTriangle } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { StatCard } from "./primitives";
import { currency } from "@/lib/format";

/**
 * Business Overview — the KPI grid at the top of the Owner Dashboard. Every
 * value comes from store.summarizePortfolio (live). Goal/Capacity come from the
 * owner config; growth/churn render "—" when there's no base to compare against.
 */
export function OwnerOverview({ summary }: { summary: OwnerSummary }) {
  const s = summary;
  const growthLabel =
    s.revenueGrowth === null ? undefined : `${s.revenueGrowth >= 0 ? "+" : ""}${Math.round(s.revenueGrowth * 100)}%`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Monthly revenue"
        value={currency(s.monthlyRevenue)}
        icon={<DollarSign className="h-4 w-4" />}
        accent
        delta={growthLabel ? { value: growthLabel, positive: (s.revenueGrowth ?? 0) >= 0 } : undefined}
        sub={`Goal ${currency(s.revenueGoal)} · ${currency(s.revenueRemaining)} to go`}
      />
      <StatCard
        label="MRR"
        value={currency(s.mrr)}
        icon={<Repeat className="h-4 w-4" />}
        sub={`${currency(s.arr)} ARR`}
      />
      <StatCard
        label="Active clients"
        value={s.activeClients}
        icon={<Users className="h-4 w-4" />}
        sub={`${s.activeClients}/${s.clientCapacity} capacity · ${s.capacityFill}%`}
      />
      <StatCard
        label="New this month"
        value={s.newClientsThisMonth}
        icon={<UserPlus className="h-4 w-4" />}
        sub={`${currency(s.avgClientValue)} avg value`}
      />
      <StatCard
        label="Monthly growth"
        value={growthLabel ?? "—"}
        icon={<TrendingUp className="h-4 w-4" />}
        sub={s.revenueGrowth === null ? "No prior month" : `vs ${currency(s.revenueLastMonth)} last mo`}
      />
      <StatCard
        label="Avg client lifetime"
        value={`${s.avgClientLifetimeMonths} mo`}
        icon={<Gauge className="h-4 w-4" />}
        sub="tenure across roster"
      />
      <StatCard
        label="Churn rate"
        value={s.churnRate === null ? "0%" : `${Math.round(s.churnRate * 100)}%`}
        icon={<Target className="h-4 w-4" />}
        sub="this month"
      />
      <StatCard
        label="Attention needed"
        value={s.pastDueClients + s.pausedClients}
        icon={<AlertTriangle className="h-4 w-4" />}
        sub={`${s.pastDueClients} past due · ${s.pausedClients} paused · ${s.cancelledClients} cancelled`}
      />
    </div>
  );
}
