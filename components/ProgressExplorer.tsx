"use client";

import { useState } from "react";
import type { ProgressPoint } from "@/lib/types";
import { LineChart } from "./LineChart";
import { shortDate } from "@/lib/format";

type MetricKey = "weight" | "bodyFat" | "leanMass" | "waist";

const METRICS: { key: MetricKey; label: string; unit: string; goalDown: boolean }[] = [
  { key: "weight", label: "Weight", unit: "lb", goalDown: true },
  { key: "bodyFat", label: "Body Fat", unit: "%", goalDown: true },
  { key: "leanMass", label: "Lean Mass", unit: "lb", goalDown: false },
  { key: "waist", label: "Waist", unit: "in", goalDown: true },
];

export function ProgressExplorer({ data }: { data: ProgressPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("weight");
  const cfg = METRICS.find((m) => m.key === metric)!;

  const points = data
    .filter((d) => d[metric] != null)
    .map((d) => ({ x: shortDate(d.date), y: d[metric] as number }));

  const first = points[0]?.y ?? 0;
  const last = points[points.length - 1]?.y ?? 0;
  const change = +(last - first).toFixed(1);
  const improved = cfg.goalDown ? change < 0 : change > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                metric === m.key ? "bg-blood-500 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {last}
            <span className="ml-1 text-sm font-normal text-zinc-500">{cfg.unit}</span>
          </div>
          <div className={`text-xs font-semibold ${improved ? "text-emerald-400" : "text-blood-400"}`}>
            {change > 0 ? "+" : ""}
            {change} {cfg.unit} since start
          </div>
        </div>
      </div>

      <LineChart
        series={{ points, color: "#e11d2a" }}
        height={260}
        yLabel={`${cfg.label} (${cfg.unit})`}
        format={(n) => `${n}`}
      />
    </div>
  );
}
