import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  User,
  Dumbbell,
  Utensils,
  ClipboardCheck,
  TrendingUp,
  NotebookPen,
  Target,
  CalendarDays,
  DollarSign,
  Flame,
  Moon,
  Battery,
  Activity,
  ExternalLink,
  Database,
  Salad,
} from "lucide-react";
import {
  getClientById,
  programsForClient,
  checkInsForClient,
  salesForClient,
  nutritionLogsForClient,
  coachNotesForClient,
  summarizeBusiness,
} from "@/lib/store";
import {
  Card,
  PageHeader,
  SectionTitle,
  StatCard,
  Pill,
  Avatar,
  ProgressBar,
  EmptyState,
} from "@/components/primitives";
import { clientHealthScore, onboardingProgress } from "@/lib/analytics/clients";
import { LineChart } from "@/components/LineChart";
import { ClientIntelligence } from "@/components/ClientIntelligence";
import { OnboardingCard } from "@/components/OnboardingCard";
import { RunAgentButton } from "@/components/RunAgentButton";
import { NutritionPlanner } from "@/components/NutritionPlanner";
import { ClientPortalLink } from "@/components/ClientPortalLink";
import { ProgramStructure } from "@/components/ProgramStructure";
import { NutritionModule } from "@/components/NutritionModule";
import { BusinessModule } from "@/components/BusinessModule";
import { BusinessActions } from "@/components/BusinessActions";
import { PaymentPanel } from "@/components/PaymentPanel";
import { CoachNotes } from "@/components/CoachNotes";
import {
  currency,
  shortDate,
  longDate,
  relativeDate,
  riskClasses,
} from "@/lib/format";

const clientStatusStyle: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Onboarding: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Paused: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Churned: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  Completed: "bg-white/5 text-zinc-400 ring-white/10",
};

const programStatusStyle: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Draft: "bg-white/5 text-zinc-400 ring-white/10",
  Completed: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
};

const checkInStatusStyle: Record<string, string> = {
  Reviewed: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Submitted: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  Pending: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
};

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const client = await getClientById(id);
  if (!client) notFound();

  const [programs, checkins, sales, nutrition, coachNotes] = await Promise.all([
    programsForClient(id),
    checkInsForClient(id),
    salesForClient(id),
    nutritionLogsForClient(id),
    coachNotesForClient(id),
  ]);

  const business = summarizeBusiness(client, sales);
  const health = clientHealthScore(client);
  const onboarding = onboardingProgress(client);
  const activeProgram = programs.find((p) => p.status === "Active") ?? programs[0];
  const latest = checkins[0];
  const previous = checkins[1];

  // Weight trend comes from real check-in bodyweights (chronological).
  const weightSeries = [...checkins]
    .reverse()
    .filter((c) => c.bodyweight > 0)
    .map((c) => ({ x: shortDate(c.date), y: c.bodyweight }));

  return (
    <div className="space-y-6">
      {/* Back to roster */}
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to roster
      </Link>

      {/* ---------------------------------------------------------------- */}
      {/* Client header                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar initials={client.avatarInitials} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{client.name}</h1>
                <Pill className={clientStatusStyle[client.status]}>{client.status}</Pill>
                <Pill className={riskClasses(client.riskLevel)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {client.riskLevel}
                </Pill>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-300">
                <Target className="h-4 w-4 text-blood-500" />
                {client.primaryGoal || "No primary goal set in Notion"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5" /> {client.currentPhase} phase
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {client.startDate ? `Started ${longDate(client.startDate)}` : "No start date"}
                </span>
                {client.coachingFocus.length > 0 && (
                  <span>{client.coachingFocus.join(" · ")}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{currency(client.monthlyRate)}</div>
              <div className="text-xs text-zinc-500">per month</div>
            </div>
            <RunAgentButton agent="coaching" label="Ask coaching advisor" body={{ clientId: client.id }} />
            <ClientPortalLink clientId={client.id} />
          </div>
        </div>
      </Card>

      {/* KPI strip (all live from Notion) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Avg compliance"
          value={`${client.compliance}%`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          sub="Rollup from check-ins"
        />
        <StatCard
          label="Last check-in"
          value={client.lastCheckIn ? relativeDate(client.lastCheckIn) : "—"}
          icon={<CalendarDays className="h-4 w-4" />}
          sub={`${checkins.length} on record`}
        />
        <StatCard
          label="Lifetime revenue"
          value={currency(client.lifetimeRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
          sub={`${sales.length} payment${sales.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Renewal"
          value={client.renewalDate ? shortDate(client.renewalDate) : "—"}
          icon={<Target className="h-4 w-4" />}
          accent
          sub={client.renewalDate ? relativeDate(client.renewalDate) : "Not set in Notion"}
        />
      </div>

      {/* Client OS intelligence (Step 6C) — health + training/engagement/nutrition */}
      <ClientIntelligence client={client} health={health} />

      {/* Onboarding lifecycle (Step 6D) — shown while the client is onboarding */}
      {onboarding.active && <OnboardingCard progress={onboarding} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ============ Left column ============ */}
        <div className="space-y-6 lg:col-span-2">
          {/* Training */}
          <Card className="p-5">
            <SectionTitle
              right={
                activeProgram ? (
                  <Pill className={programStatusStyle[activeProgram.status]}>
                    {activeProgram.status}
                  </Pill>
                ) : undefined
              }
            >
              <span className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-blood-500" /> Training
              </span>
            </SectionTitle>

            {activeProgram ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-ink-850/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">{activeProgram.name}</span>
                    {activeProgram.link && (
                      <a
                        href={activeProgram.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blood-400 hover:text-blood-300"
                      >
                        Open program <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Field label="Type" value={activeProgram.type} />
                    <Field label="Phase" value={activeProgram.phase} />
                    <Field
                      label="Start"
                      value={activeProgram.startDate ? shortDate(activeProgram.startDate) : "—"}
                    />
                    <Field
                      label="End"
                      value={activeProgram.endDate ? shortDate(activeProgram.endDate) : "—"}
                    />
                  </div>
                </div>

                {/* Weekly structure — renders whatever the program actually
                    contains. Live Notion Programs hold metadata only (the plan
                    lives in the linked sheet), so weeks is empty there and the
                    clean empty state below is shown instead. Nothing invented. */}
                {activeProgram.weeks.length > 0 ? (
                  <ProgramStructure weeks={activeProgram.weeks} />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
                    <Dumbbell className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-300">
                      Weekly plan not stored in Notion
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">
                      This program&apos;s day-by-day exercises, sets, reps, and loads live in the
                      linked program sheet. Open it below, or add a Workouts database
                      (Program, Week, Day, Exercise, Sets, Reps, Load, RPE) to show them here.
                    </p>
                    {activeProgram.link && (
                      <a
                        href={activeProgram.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blood-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blood-600"
                      >
                        Open program sheet <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {programs.length > 1 && (
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      Program history
                    </div>
                    <ul className="space-y-1.5">
                      {programs.slice(1).map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between rounded-lg bg-ink-900/60 px-3 py-2 text-sm"
                        >
                          <span className="text-zinc-300">{p.name}</span>
                          <span className="text-xs text-zinc-500">
                            {p.type} · {p.startDate ? shortDate(p.startDate) : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="No training program assigned"
                hint="Assign one from the coach dashboard, or POST /api/programs."
              />
            )}
          </Card>

          {/* Check-ins */}
          <Card className="p-5">
            <SectionTitle right={<span className="text-xs text-zinc-500">{checkins.length}</span>}>
              <span className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blood-500" /> Check-ins
              </span>
            </SectionTitle>

            {latest ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-ink-850/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Latest · {shortDate(latest.date)}
                    </span>
                    <Pill className={checkInStatusStyle[latest.status]}>{latest.status}</Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric icon={<Activity className="h-4 w-4" />} label="Bodyweight" value={`${latest.bodyweight} lb`} />
                    <Metric icon={<ClipboardCheck className="h-4 w-4" />} label="Compliance" value={`${latest.compliance}%`} />
                    <Metric icon={<Moon className="h-4 w-4" />} label="Sleep" value={latest.sleep} />
                    <Metric icon={<Flame className="h-4 w-4" />} label="Stress" value={latest.stress} />
                    <Metric icon={<Battery className="h-4 w-4" />} label="Energy" value={latest.energy} />
                  </div>
                  {latest.wins && (
                    <p className="mt-3 text-sm text-zinc-300">
                      <span className="font-medium text-emerald-400">Wins: </span>
                      {latest.wins}
                    </p>
                  )}
                  {latest.challenges && (
                    <p className="mt-1.5 text-sm text-zinc-300">
                      <span className="font-medium text-amber-400">Challenges: </span>
                      {latest.challenges}
                    </p>
                  )}
                  {latest.notes && (
                    <p className="mt-1.5 text-sm text-zinc-400">
                      <span className="font-medium text-zinc-300">Notes: </span>
                      {latest.notes}
                    </p>
                  )}
                  {latest.adjustments && (
                    <p className="mt-3 rounded-lg bg-blood-500/[0.08] px-3 py-2 text-sm text-zinc-300">
                      <span className="font-medium text-blood-400">Coach adjustment: </span>
                      {latest.adjustments}
                    </p>
                  )}
                </div>

                {checkins.length > 1 && (
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      Previous check-ins
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                            <th className="py-2 pr-4 font-semibold">Date</th>
                            <th className="py-2 pr-4 font-semibold">Weight</th>
                            <th className="py-2 pr-4 font-semibold">Compliance</th>
                            <th className="py-2 pr-4 font-semibold">Sleep</th>
                            <th className="py-2 pr-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {checkins.slice(1).map((c) => (
                            <tr key={c.id} className="text-zinc-300">
                              <td className="py-2 pr-4">{shortDate(c.date)}</td>
                              <td className="py-2 pr-4">{c.bodyweight} lb</td>
                              <td className="py-2 pr-4">{c.compliance}%</td>
                              <td className="py-2 pr-4">{c.sleep}</td>
                              <td className="py-2 pr-4">
                                <Pill className={checkInStatusStyle[c.status]}>{c.status}</Pill>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="No check-ins yet"
                hint="Submitted check-ins from this client will appear here."
              />
            )}
          </Card>

          {/* Progress */}
          <Card className="p-5">
            <SectionTitle
              right={
                previous && latest ? (
                  <span className="text-xs text-zinc-500">
                    {(latest.bodyweight - previous.bodyweight >= 0 ? "+" : "") +
                      (latest.bodyweight - previous.bodyweight).toFixed(1)}{" "}
                    lb vs last
                  </span>
                ) : undefined
              }
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blood-500" /> Progress
              </span>
            </SectionTitle>

            {weightSeries.length > 1 ? (
              <LineChart
                series={{ points: weightSeries, color: "#e11d2a" }}
                height={220}
                yLabel="Bodyweight (lb)"
                format={(n) => `${n}`}
              />
            ) : (
              <EmptyState
                title="Not enough data for a weight trend"
                hint="Trends draw from check-in bodyweights — needs at least two check-ins."
              />
            )}

            <FieldGap
              title="Body composition & performance trends not in Notion"
              fields={[
                "Body fat %, lean mass, and measurements aren't captured today.",
                "Add them to the Check-ins database (Body Fat %, Lean Mass, Waist) or a Measurements database to chart them here.",
                "Strength/performance trends need the Workouts/Sets database described in Training.",
              ]}
            />
          </Card>
        </div>

        {/* ============ Right column ============ */}
        <div className="space-y-6">
          {/* Profile */}
          <Card className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-blood-500" /> Profile
              </span>
            </SectionTitle>
            <dl className="space-y-2.5 text-sm">
              <Row label="Email" value={client.email || "—"} />
              <Row label="Source" value={client.source || "—"} />
              <Row
                label="Focus"
                value={client.coachingFocus.length ? client.coachingFocus.join(", ") : "—"}
              />
              <Row label="Goal" value={client.primaryGoal || "—"} />
              <Row
                label="Latest weight"
                value={latest?.bodyweight ? `${latest.bodyweight} lb` : "—"}
              />
              <div className="pt-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Avg compliance</span>
                  <span className="text-zinc-300">{client.compliance}%</span>
                </div>
                <ProgressBar value={client.compliance} />
              </div>
            </dl>

            <FieldGap
              title="Profile fields not in Notion yet"
              fields={[
                "Age, Height, and Training Experience aren't in the Clients database.",
                "Add Age (number), Height (text), Training Experience (select) to Clients to show them here.",
              ]}
            />
          </Card>

          {/* Nutrition (live from the Notion Nutrition database) */}
          <Card className="p-5">
            <SectionTitle
              right={
                nutrition.length ? (
                  <span className="text-xs text-zinc-500">
                    {nutrition.length} log{nutrition.length === 1 ? "" : "s"}
                  </span>
                ) : undefined
              }
            >
              <span className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-blood-500" /> Nutrition
              </span>
            </SectionTitle>
            <NutritionModule logs={nutrition} />
          </Card>

          {/* Coach notes */}
          <Card className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-blood-500" /> Coach notes
              </span>
            </SectionTitle>
            <CoachNotes
              clientId={client.id}
              author="Shane Lanteigne"
              initialNotes={coachNotes}
            />
          </Card>
        </div>
      </div>

      {/* Business & Billing (full-width, live from Sales + Client) */}
      <Card className="p-5">
        <SectionTitle right={<span className="text-xs text-zinc-500">{sales.length} payments</span>}>
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blood-500" /> Business &amp; Billing
          </span>
        </SectionTitle>
        <BusinessModule client={client} summary={business} sales={sales} />
        <BusinessActions clientId={client.id} monthlyRate={client.monthlyRate} plan={client.plan} />
        <div className="mt-4">
          <PaymentPanel variant="coach" defaultAmount={client.monthlyRate} clientName={client.name} note={`SL Strength — ${client.name}`} />
        </div>
      </Card>

      {/* Nutrition Plan — targets + AI meal plan grounded in the nutrition DB */}
      <Card className="p-5">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Salad className="h-4 w-4 text-blood-500" /> Nutrition Plan
          </span>
        </SectionTitle>
        <NutritionPlanner clientId={client.id} clientName={client.name} initialProfile={client.nutritionProfile} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Local presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-0.5 font-medium text-zinc-200">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-900/60 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span className="text-zinc-600">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

/**
 * Honest gap marker: names the missing Notion fields instead of inventing data,
 * per the build rule "explain what database field is needed rather than
 * creating fake data."
 */
function FieldGap({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <Database className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-zinc-500">
        {fields.map((f, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-zinc-700">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
