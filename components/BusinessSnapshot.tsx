import { DollarSign, Repeat, Users, UserPlus, Gauge, Target } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { StatCard, ProgressBar, Card } from "./primitives";
import { currency } from "@/lib/format";

/**
 * Business Snapshot — the six top-line answers to "how are we doing today?".
 * All values from lib/analytics via summarizeOwner. Reuses StatCard.
 */
export function BusinessSnapshot({ summary: s }: { summary: OwnerSummary }) {
  const growth =
    s.revenueGrowth === null ? undefined : `${s.revenueGrowth >= 0 ? "+" : ""}${Math.round(s.revenueGrowth * 100)}%`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Monthly revenue"
        value={currency(s.monthlyRevenue)}
        icon={<DollarSign className="h-4 w-4" />}
        accent
        delta={growth ? { value: growth, positive: (s.revenueGrowth ?? 0) >= 0 } : undefined}
        sub={`${currency(s.revenueRemaining)} to goal`}
      />
      <StatCard label="MRR" value={currency(s.mrr)} icon={<Repeat className="h-4 w-4" />} sub={`${currency(s.arr)} ARR`} />
      <StatCard
        label="Active clients"
        value={s.activeClients}
        icon={<Users className="h-4 w-4" />}
        sub={`${s.capacityRemaining} slot${s.capacityRemaining === 1 ? "" : "s"} open`}
      />
      <StatCard
        label="New this month"
        value={s.newClientsThisMonth}
        icon={<UserPlus className="h-4 w-4" />}
        sub={`${s.newLeads} open lead${s.newLeads === 1 ? "" : "s"}`}
      />
      <StatCard
        label="Client capacity"
        value={`${s.activeClients}/${s.clientCapacity}`}
        icon={<Gauge className="h-4 w-4" />}
        sub={`${s.capacityFill}% full`}
      />
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <span className="stat-label">Revenue goal</span>
          <span className="text-zinc-500">
            <Target className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{s.goalProgress}%</span>
          <span className="text-xs text-zinc-500">
            {currency(s.monthlyRevenue)} / {currency(s.revenueGoal)}
          </span>
        </div>
        <ProgressBar value={s.goalProgress} className="mt-3" />
      </Card>
    </div>
  );
}
