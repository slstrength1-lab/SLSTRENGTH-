import type { ReactNode } from "react";
import { HeartPulse, Dumbbell, ClipboardCheck, Utensils, Plus, Minus } from "lucide-react";
import type { Client } from "@/lib/types";
import type { ClientHealthScore, HealthCategory, HealthFactor } from "@/lib/analytics/clients";
import { Card, SectionTitle, Ring } from "./primitives";
import { pct, shortDate, relativeDate } from "@/lib/format";

/**
 * Client OS intelligence tiles — Health, Training, Engagement, Nutrition.
 * Presentational only: the health score is computed in the page (analytics) and
 * passed in; the metric tiles read fields already on the Client (surfaced in
 * Step 6A). Missing data renders an honest empty state — nothing is fabricated.
 */
const categoryRing: Record<HealthCategory, string> = {
  Excellent: "#10b981",
  Good: "#38bdf8",
  Moderate: "#f59e0b",
  "At risk": "#e11d2a",
};
const categoryText: Record<HealthCategory, string> = {
  Excellent: "text-emerald-400",
  Good: "text-sky-400",
  Moderate: "text-amber-400",
  "At risk": "text-blood-400",
};

/** A factor is a "+" when it earns most of its max, a "-" when it earns little. */
function sentiment(f: HealthFactor): "pos" | "neg" | "neutral" {
  if (!f.available) return "neutral";
  const ratio = f.max ? f.points / f.max : 0;
  return ratio >= 0.7 ? "pos" : ratio < 0.5 ? "neg" : "neutral";
}

export function ClientIntelligence({ client, health }: { client: Client; health: ClientHealthScore }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Health */}
      <Card className="p-5 lg:col-span-2">
        <SectionTitle right={<span className="text-xs text-zinc-500">Confidence {pct(health.confidence * 100)}</span>}>
          <span className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-blood-500" /> Client health
          </span>
        </SectionTitle>
        <div className="flex items-center gap-4">
          <Ring value={health.score} size={104} label={String(health.score)} sublabel={health.category} color={categoryRing[health.category]} />
          <ul className="min-w-0 flex-1 space-y-1.5">
            {health.factors.map((f) => {
              const s = sentiment(f);
              return (
                <li key={f.name} className="flex items-start gap-2 text-xs">
                  {s === "pos" ? (
                    <Plus className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                  ) : s === "neg" ? (
                    <Minus className="mt-0.5 h-3 w-3 shrink-0 text-blood-400" />
                  ) : (
                    <span className="mt-0.5 h-3 w-3 shrink-0 text-center text-zinc-600">·</span>
                  )}
                  <span className="min-w-0">
                    <span className="font-medium text-zinc-300">{f.name}</span>
                    <span className="text-zinc-600"> — {f.available ? f.detail : "no data"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`mt-3 text-sm font-semibold ${categoryText[health.category]}`}>{health.category}</div>
      </Card>

      {/* Training */}
      <MetricTile
        icon={<Dumbbell className="h-4 w-4 text-blood-500" />}
        title="Training"
        rows={[
          { label: "Workout completion", value: typeof client.workoutCompletion === "number" ? `${client.workoutCompletion}%` : null },
          { label: "Avg RPE", value: typeof client.avgRPE === "number" ? client.avgRPE.toFixed(1) : null },
          { label: "Last workout", value: client.lastWorkout ? shortDate(client.lastWorkout) : null },
          { label: "Exercises logged", value: typeof client.totalExercisesLogged === "number" ? String(client.totalExercisesLogged) : null },
        ]}
        empty="No workout data yet"
      />

      {/* Engagement */}
      <MetricTile
        icon={<ClipboardCheck className="h-4 w-4 text-blood-500" />}
        title="Engagement"
        rows={[
          { label: "Total check-ins", value: typeof client.totalCheckIns === "number" ? String(client.totalCheckIns) : String(0) },
          { label: "Last check-in", value: client.lastCheckIn ? relativeDate(client.lastCheckIn) : null },
        ]}
        empty="No check-ins yet"
      />

      {/* Nutrition */}
      <MetricTile
        icon={<Utensils className="h-4 w-4 text-blood-500" />}
        title="Nutrition"
        rows={[
          { label: "Avg compliance", value: typeof client.avgNutritionCompliance === "number" ? `${client.avgNutritionCompliance}%` : null },
          { label: "Last log", value: client.lastNutritionLog ? shortDate(client.lastNutritionLog) : null },
        ]}
        empty="No nutrition data yet"
      />
    </div>
  );
}

function MetricTile({
  icon,
  title,
  rows,
  empty,
}: {
  icon: ReactNode;
  title: string;
  rows: { label: string; value: string | null }[];
  empty: string;
}) {
  const hasAny = rows.some((r) => r.value !== null);
  return (
    <Card className="p-5">
      <SectionTitle>
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </SectionTitle>
      {hasAny ? (
        <dl className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500">{r.label}</dt>
              <dd className="font-medium text-zinc-200">{r.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="py-4 text-center text-xs text-zinc-500">{empty}</p>
      )}
    </Card>
  );
}
