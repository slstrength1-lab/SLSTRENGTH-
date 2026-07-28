import { Users, PauseCircle, AlertTriangle, XCircle } from "lucide-react";
import type { OwnerSummary } from "@/lib/types";
import { Card, SectionTitle, Ring } from "./primitives";

/**
 * Business Health — client-status counts and the three compliance rings
 * (check-in, workout, nutrition). Values from lib/analytics. Rings whose data
 * doesn't exist yet render "—" (honest empty), never a fake zero.
 */
function Count({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
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

export function BusinessHealth({ summary: s }: { summary: OwnerSummary }) {
  return (
    <Card className="p-5">
      <SectionTitle>Business health</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        {/* Status counts */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Count label="Active" value={s.activeClients} icon={<Users className="h-3.5 w-3.5" />} tone="text-emerald-400" />
          <Count label="Paused" value={s.pausedClients} icon={<PauseCircle className="h-3.5 w-3.5" />} tone="text-amber-400" />
          <Count label="Past due" value={s.pastDueClients} icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="text-blood-400" />
          <Count label="Cancelled" value={s.cancelledClients} icon={<XCircle className="h-3.5 w-3.5" />} tone="text-zinc-500" />
        </div>

        {/* Compliance rings */}
        <div className="grid grid-cols-3 gap-4">
          <div className="grid place-items-center">
            <Ring value={s.portfolioCompliance} size={92} label={`${s.portfolioCompliance}%`} sublabel="Check-ins" />
          </div>
          <div className="grid place-items-center">
            <Ring
              value={s.workoutCompletion ?? 0}
              size={92}
              label={s.workoutCompletion === null ? "—" : `${s.workoutCompletion}%`}
              sublabel="Workouts"
              color="#f59e0b"
            />
          </div>
          <div className="grid place-items-center">
            <Ring
              value={s.nutritionCompliance ?? 0}
              size={92}
              label={s.nutritionCompliance === null ? "—" : `${s.nutritionCompliance}%`}
              sublabel="Nutrition"
              color="#10b981"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
