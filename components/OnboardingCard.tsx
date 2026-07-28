import { Rocket, ArrowRight } from "lucide-react";
import type { OnboardingProgress } from "@/lib/analytics/clients";
import { Card, SectionTitle, Pill, ProgressBar } from "./primitives";
import { longDate } from "@/lib/format";

/**
 * Onboarding lifecycle card — surfaces where a new client is in onboarding.
 * Presentational only: the page computes onboardingProgress (analytics) and
 * passes it in. Checklist items themselves are tracked as Coach Notes (the
 * locked lifecycle decision — no Tasks database).
 */
export function OnboardingCard({ progress: p }: { progress: OnboardingProgress }) {
  return (
    <Card className="p-5">
      <SectionTitle
        right={
          <span className="text-xs text-zinc-500">
            {p.isComplete ? "Complete" : `Step ${Math.max(1, p.step)} of ${p.totalSteps}`}
          </span>
        }
      >
        <span className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-blood-500" /> Onboarding
        </span>
      </SectionTitle>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill className="bg-sky-500/15 text-sky-400 ring-sky-500/25">
          {p.stage ?? "Not started"}
        </Pill>
        {p.nextStage && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <ArrowRight className="h-3.5 w-3.5" /> Next: <span className="text-zinc-300">{p.nextStage}</span>
          </span>
        )}
        {p.isComplete && <span className="text-xs font-medium text-emerald-400">Fully onboarded 🎉</span>}
      </div>

      <ProgressBar value={p.percent} />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 text-[11px] text-zinc-600">
        <span>{p.percent}% complete</span>
        {p.started && <span>Started {longDate(p.started)}</span>}
        {p.completed && <span>Onboarded {longDate(p.completed)}</span>}
      </div>
      <p className="mt-2 text-[11px] text-zinc-600">Onboarding steps are tracked as Coach Notes below.</p>
    </Card>
  );
}
