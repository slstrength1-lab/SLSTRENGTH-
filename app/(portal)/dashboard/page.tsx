import Link from "next/link";
import {
  Target,
  Flame,
  Scale,
  CalendarCheck,
  ArrowRight,
  Dumbbell,
  MessageSquare,
} from "lucide-react";
import {
  getCurrentClient,
  programForClient,
  progressForClient,
  prioritiesForClient,
  messagesForClient,
  checkInsForClient,
} from "@/lib/store";
import {
  Card,
  PageHeader,
  SectionTitle,
  Pill,
  StatCard,
  Ring,
  ProgressBar,
} from "@/components/primitives";
import { WeeklyPriorities } from "@/components/WeeklyPriorities";
import { LineChart } from "@/components/LineChart";
import { PaymentPanel } from "@/components/PaymentPanel";
import { riskClasses, shortDate, relativeDate } from "@/lib/format";

export default async function DashboardPage() {
  const client = await getCurrentClient();
  const [program, checkins] = await Promise.all([
    programForClient(client.id),
    checkInsForClient(client.id),
  ]);
  const progress = progressForClient(client.id);
  const priorities = prioritiesForClient(client.id);
  const messages = messagesForClient(client.id);

  const first = progress[0];
  const latest = progress[progress.length - 1];
  const weightChange = latest && first ? +(latest.weight - first.weight).toFixed(1) : 0;
  const bfChange =
    latest?.bodyFat && first?.bodyFat ? +(latest.bodyFat - first.bodyFat).toFixed(1) : 0;

  const nextSession = program?.weeks[0]?.days.find((d) => !d.completed);
  const lastCoachNote = [...messages].reverse().find((m) => m.from === "coach");

  const hour = 9; // fixed for the prototype's deterministic render
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={greeting}
        title={client.name.split(" ")[0]}
        subtitle="Here's your week at a glance."
        actions={
          <Link
            href="/checkins"
            className="inline-flex items-center gap-2 rounded-xl bg-blood-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-blood-600"
          >
            <CalendarCheck className="h-4 w-4" />
            Submit check-in
          </Link>
        }
      />

      {/* Hero: goal + phase + compliance ring */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill className={riskClasses(client.riskLevel)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {client.riskLevel === "Green" ? "On track" : `${client.riskLevel} — needs focus`}
              </Pill>
              {client.coachingFocus.map((f) => (
                <Pill key={f} className="bg-white/5 text-zinc-300 ring-white/10">
                  {f}
                </Pill>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-blood-500" />
              <div>
                <div className="stat-label">Primary goal</div>
                <p className="mt-0.5 text-lg font-semibold text-white">{client.primaryGoal}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="stat-label">Current phase</div>
                <div className="mt-1 font-semibold text-white">{client.currentPhase}</div>
              </div>
              <div>
                <div className="stat-label">Program</div>
                <div className="mt-1 font-semibold text-white">{program?.type ?? "—"}</div>
              </div>
              <div>
                <div className="stat-label">Coaching since</div>
                <div className="mt-1 font-semibold text-white">{shortDate(client.startDate)}</div>
              </div>
              <div>
                <div className="stat-label">Renews</div>
                <div className="mt-1 font-semibold text-white">{shortDate(client.renewalDate)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl bg-ink-850/60 p-6 ring-1 ring-inset ring-white/[0.06]">
            <div className="flex flex-col items-center">
              <Ring value={client.compliance} label={`${client.compliance}%`} sublabel="Compliance" />
              <p className="mt-3 max-w-[10rem] text-center text-xs text-zinc-500">
                4-week average adherence to your plan
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current weight"
          value={`${latest?.weight ?? "—"} lb`}
          icon={<Scale className="h-4 w-4" />}
          delta={{ value: `${weightChange} lb`, positive: weightChange < 0 }}
          sub={`Since start (${shortDate(client.startDate)})`}
        />
        <StatCard
          label="Body fat"
          value={`${latest?.bodyFat ?? "—"}%`}
          icon={<Flame className="h-4 w-4" />}
          delta={{ value: `${bfChange}%`, positive: bfChange < 0 }}
          sub="Estimated"
        />
        <StatCard
          label="Compliance"
          value={`${client.compliance}%`}
          icon={<Target className="h-4 w-4" />}
          accent
          sub="Last 4 weeks"
        />
        <StatCard
          label="Last check-in"
          value={relativeDate(client.lastCheckIn)}
          icon={<CalendarCheck className="h-4 w-4" />}
          sub={shortDate(client.lastCheckIn)}
        />
      </div>

      {/* Priorities + next session + trend */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <SectionTitle>This week's priorities</SectionTitle>
          <WeeklyPriorities initial={priorities} />
        </Card>

        <Card className="p-5 lg:col-span-1">
          <SectionTitle right={<Link href="/training" className="text-xs font-medium text-blood-500">View plan</Link>}>
            Next session
          </SectionTitle>
          {nextSession ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blood-500/10 text-blood-500 ring-1 ring-inset ring-blood-500/25">
                  <Dumbbell className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold text-white">{nextSession.day}</div>
                  <div className="text-xs text-zinc-500">{nextSession.focus}</div>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {nextSession.exercises.slice(0, 4).map((ex) => (
                  <li key={ex.name} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{ex.name}</span>
                    <span className="text-zinc-500">
                      {ex.sets}×{ex.reps}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/training"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blood-500"
              >
                Open full workout <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">All sessions complete this week. 🔥</p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-1">
          <SectionTitle right={<Link href="/progress" className="text-xs font-medium text-blood-500">Details</Link>}>
            Weight trend
          </SectionTitle>
          <LineChart
            series={{ points: progress.map((p) => ({ x: shortDate(p.date), y: p.weight })) }}
            height={160}
            format={(n) => `${n}`}
          />
        </Card>
      </div>

      {/* Coach note + upcoming */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={<Link href="/messages" className="text-xs font-medium text-blood-500">Open messages</Link>}>
            Latest from your coach
          </SectionTitle>
          {lastCoachNote ? (
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blood-500 to-blood-700 text-xs font-bold text-white">
                SL
              </span>
              <div className="rounded-2xl rounded-tl-sm bg-ink-850/70 px-4 py-3">
                <div className="mb-1 text-xs font-semibold text-white">Shane · Head Coach</div>
                <p className="text-sm text-zinc-300">{lastCoachNote.body}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No messages yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Compliance breakdown</SectionTitle>
          <div className="space-y-3">
            {[
              { label: "Training", value: 100 },
              { label: "Nutrition", value: 84 },
              { label: "Steps", value: 96 },
              { label: "Sleep", value: 72 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{row.label}</span>
                  <span className="font-medium text-zinc-300">{row.value}%</span>
                </div>
                <ProgressBar value={row.value} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            {checkins.length} check-ins logged · latest {relativeDate(client.lastCheckIn)}
          </p>
        </Card>
      </div>

      {/* Make a payment — Venmo / Cash App (renders only when handles are configured) */}
      <PaymentPanel variant="client" defaultAmount={client.monthlyRate} note="SL Strength coaching" />
    </div>
  );
}
