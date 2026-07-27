import type { ReactNode } from "react";
import { Utensils } from "lucide-react";
import type { NutritionLog } from "@/lib/types";
import { EmptyState, ProgressBar } from "./primitives";
import { LineChart } from "./LineChart";
import { shortDate, relativeDate } from "@/lib/format";

/**
 * Client Command Center — Nutrition module (read-only, server-rendered).
 *
 * Renders live weekly nutrition logs from the Notion Nutrition database:
 * current macro targets, a compliance trend, and the latest notes. When the
 * client has no logs yet it shows a clean empty state — nothing is fabricated.
 */
export function NutritionModule({ logs }: { logs: NutritionLog[] }) {
  if (!logs.length) {
    return (
      <EmptyState
        title="No nutrition logged yet"
        hint="Weekly macro targets and compliance will appear here once logged."
      />
    );
  }

  const latest = logs[0]; // newest-first
  const trend = [...logs]
    .reverse()
    .filter((l) => l.compliance > 0)
    .map((l) => ({ x: shortDate(l.date), y: l.compliance }));

  return (
    <div className="space-y-4">
      {/* Latest week header: strategy + compliance */}
      <div className="rounded-xl bg-ink-850/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              {latest.strategy || "Current plan"}
            </div>
            <div className="text-xs text-zinc-500">
              Week of {latest.date ? shortDate(latest.date) : "—"}
              {latest.date && <span> · {relativeDate(latest.date)}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{latest.compliance}%</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">compliance</div>
          </div>
        </div>
        <ProgressBar value={latest.compliance} className="mt-3" />

        {/* Macro targets */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Macro
            label="Calories"
            value={latest.targetCalories ? `${latest.targetCalories}` : "—"}
            sub={latest.caloriesActual ? `${latest.caloriesActual} actual` : "target"}
          />
          <Macro label="Protein" value={macro(latest.protein)} sub="g" />
          <Macro label="Carbs" value={macro(latest.carbs)} sub="g" />
          <Macro label="Fat" value={macro(latest.fat)} sub="g" />
        </div>
      </div>

      {/* Compliance trend */}
      {trend.length > 1 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Compliance trend · last {trend.length} weeks
          </div>
          <LineChart
            series={{ points: trend, color: "#e11d2a" }}
            height={180}
            yLabel="Compliance (%)"
            format={(n) => `${n}%`}
          />
        </div>
      )}

      {/* Latest notes */}
      {latest.notes && (
        <p className="rounded-lg bg-ink-900/60 px-3 py-2 text-sm text-zinc-300">
          <span className="font-medium text-blood-400">Notes: </span>
          {latest.notes}
        </p>
      )}
    </div>
  );
}

function macro(n: number): string {
  return n ? `${n}` : "—";
}

function Macro({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <div className="rounded-lg bg-ink-900/60 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Utensils className="h-3 w-3 text-zinc-600" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      <div className="text-[11px] text-zinc-600">{sub}</div>
    </div>
  );
}
