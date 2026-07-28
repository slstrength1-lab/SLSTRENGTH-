/**
 * Server data-access layer used by the pages.
 *
 * Pages call these functions instead of touching Notion or the sample data
 * directly. Notion-backed resources (clients, leads, sales, check-ins,
 * programs, content, metrics) flow through the `notion` adapter — which is
 * live when NOTION_API_KEY is set and falls back to sample data otherwise.
 *
 * A few portal features (nutrition plan, body-composition history, the
 * message thread, weekly priorities) have no Notion database yet, so they
 * continue to serve representative sample data for the selected client.
 *
 * `cache()` dedupes each Notion query within a single request/render.
 */

import { cache } from "react";
import { notion } from "./notion";
import * as sample from "./data";
import type {
  Client,
  Program,
  CheckIn,
  Lead,
  Sale,
  ContentItem,
  Metric,
  ProgramPhase,
  ProgramWeek,
  WorkoutDay,
  Exercise,
  WorkoutRow,
  NutritionPlan,
  NutritionLog,
  CoachNote,
  BusinessSummary,
  OwnerSummary,
  PriorityGroup,
  PriorityItem,
  CalendarEvent,
  ActivityItem,
  TopClient,
  UpcomingPayment,
  ProgressPoint,
  Message,
  WeeklyPriority,
} from "./types";
import type { OwnerConfig } from "./config";
import { getOwnerConfig } from "./config";

/* Per-request cached fetchers ------------------------------------- */

const clientsRaw = cache(() => notion.getClients());
const programsRaw = cache(() => notion.getPrograms());
const checkInsRaw = cache(() => notion.getCheckIns());
const leadsRaw = cache(() => notion.getLeads());
const salesRaw = cache(() => notion.getSales());
const contentRaw = cache(() => notion.getContent());
const metricsRaw = cache(() => notion.getMetrics());
const workoutsRaw = cache(() => notion.getWorkouts());
const nutritionRaw = cache(() => notion.getNutrition());
const coachNotesRaw = cache(() => notion.getCoachNotes());

function activePhase(programs: Program[], clientId: string): ProgramPhase | undefined {
  const p =
    programs.find((x) => x.clientId === clientId && x.status === "Active") ??
    programs.find((x) => x.clientId === clientId);
  return p?.phase;
}

/**
 * Assemble the Notion Workouts rows for one program into the renderable
 * `ProgramWeek[]` shape, grouped Week → Day → Order. Returns [] when there are
 * no rows — nothing is fabricated. This is the bridge from the flat, AI-friendly
 * Workouts database to the existing training UI (ProgramStructure / TrainingProgram).
 */
function weeksFromWorkouts(rows: WorkoutRow[]): ProgramWeek[] {
  if (!rows.length) return [];
  const byWeek = new Map<number, WorkoutRow[]>();
  for (const r of rows) {
    const arr = byWeek.get(r.week) ?? [];
    arr.push(r);
    byWeek.set(r.week, arr);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, weekRows]) => {
      const byDay = new Map<number, WorkoutRow[]>();
      for (const r of weekRows) {
        const arr = byDay.get(r.day) ?? [];
        arr.push(r);
        byDay.set(r.day, arr);
      }
      const days: WorkoutDay[] = [...byDay.entries()]
        .sort(([a], [b]) => a - b)
        .map(([day, dayRows]) => {
          const ordered = [...dayRows].sort((a, b) => a.order - b.order);
          const focus = ordered.find((r) => r.focus)?.focus ?? "";
          return {
            day: focus ? `Day ${day} — ${focus}` : `Day ${day}`,
            focus,
            completed: ordered.length > 0 && ordered.every((r) => r.completed),
            exercises: ordered.map(
              (r): Exercise => ({
                name: r.exercise,
                sets: r.sets,
                reps: r.reps,
                load: r.load,
                rest: "",
                notes: r.notes,
                tempo: r.tempo,
                rpe: r.rpe,
                actualLoad: r.actualLoad,
                actualReps: r.actualReps,
                completed: r.completed,
              }),
            ),
          };
        });
      return { week, label: `Week ${week}`, days };
    });
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export const getClients = cache(async (): Promise<Client[]> => {
  const [clients, programs] = await Promise.all([clientsRaw(), programsRaw()]);
  // Enrich each client's current phase from their active program.
  return clients.map((c) => ({
    ...c,
    currentPhase: activePhase(programs, c.id) ?? c.currentPhase,
  }));
});

export async function getClientById(id: string): Promise<Client | undefined> {
  return (await getClients()).find((c) => c.id === id);
}

/**
 * The client currently "logged in" to the portal.
 * Prefers NOTION_DEMO_CLIENT_EMAIL, then the first Active client, then any.
 */
export async function getCurrentClient(): Promise<Client> {
  const clients = await getClients();
  const preferEmail = process.env.NOTION_DEMO_CLIENT_EMAIL;
  return (
    (preferEmail && clients.find((c) => c.email === preferEmail)) ||
    clients.find((c) => c.status === "Active") ||
    clients[0]
  );
}

/* ------------------------------------------------------------------ */
/* Programs (with training-structure template)                         */
/* ------------------------------------------------------------------ */

export async function programForClient(clientId: string): Promise<Program | undefined> {
  const [programs, workouts] = await Promise.all([programsRaw(), workoutsRaw()]);
  const program =
    programs.find((p) => p.clientId === clientId && p.status === "Active") ??
    programs.find((p) => p.clientId === clientId);
  if (!program) return undefined;
  // Prefer the real Workouts database once rows exist for this program.
  const realWeeks = weeksFromWorkouts(workouts.filter((w) => w.programId === program.id));
  if (realWeeks.length) return { ...program, weeks: realWeeks };
  if (program.weeks.length > 0) return program;
  // No Workouts rows yet: attach a sample training block so the athlete's
  // Training page still renders during the prototype phase.
  const template = sample.programs.find((s) => s.clientId === clientId) ?? sample.programs[0];
  return { ...program, weeks: template?.weeks ?? [] };
}

/**
 * Every program on record for a client (newest first), straight from Notion —
 * no sample training template is borrowed here, so the coach view only ever
 * shows real data. Use `programForClient` when you need the renderable weekly
 * structure on the athlete's Training page.
 */
export async function programsForClient(clientId: string): Promise<Program[]> {
  const [all, workouts] = await Promise.all([programsRaw(), workoutsRaw()]);
  return all
    .filter((p) => p.clientId === clientId)
    // Attach real weekly structure from the Workouts database (empty until rows
    // are entered — the coach view then shows its clean empty state).
    .map((p) => ({ ...p, weeks: weeksFromWorkouts(workouts.filter((w) => w.programId === p.id)) }))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Check-ins                                                           */
/* ------------------------------------------------------------------ */

export async function checkInsForClient(clientId: string): Promise<CheckIn[]> {
  const all = await checkInsRaw();
  return all
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Sales/payments recorded against a client (newest first), from Notion. */
export async function salesForClient(clientId: string): Promise<Sale[]> {
  const all = await salesRaw();
  return all
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Business analytics (per-client) — computed live from Sales + Client */
/* ------------------------------------------------------------------ */

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}
function monthsBetween(fromISO: string, toISO: string): number {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO + (fromISO.length === 10 ? "T00:00:00" : ""));
  const b = new Date(toISO + (toISO.length === 10 ? "T00:00:00" : ""));
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}
/** Whole days from `fromISO` to `toISO` (negative if `toISO` is in the past). */
function dayDiff(fromISO: string, toISO: string): number | null {
  if (!fromISO || !toISO) return null;
  const a = new Date(fromISO + (fromISO.length === 10 ? "T00:00:00" : "")).getTime();
  const b = new Date(toISO + (toISO.length === 10 ? "T00:00:00" : "")).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}
/** True when `dateISO` falls within the next `days` days (inclusive of today). */
function withinNextDays(dateISO: string, nowISO: string, days: number): boolean {
  const d = dayDiff(nowISO, dateISO);
  return d !== null && d >= 0 && d <= days;
}

/**
 * Compute the per-client Business summary from that client's Sales rows and
 * Client fields. Pure — no fetching, no fabrication. Only Paid sales count
 * toward revenue. `nowISO` defaults to the current date; pass one for tests.
 */
export function summarizeBusiness(
  client: Client,
  sales: Sale[],
  nowISO: string = new Date().toISOString().slice(0, 10),
): BusinessSummary {
  const paid = sales.filter((s) => s.paymentStatus === "Paid");
  const lifetimeRevenue = paid.reduce((sum, s) => sum + s.amount, 0);
  const payments = paid.length;
  const lastPayment = paid.reduce((latest, s) => (s.date > latest ? s.date : latest), "");

  const endRef = client.cancelledDate || nowISO;
  const retentionMonths = client.startDate ? monthsBetween(client.startDate, endRef) : 0;
  const clientAgeMonths = client.startDate ? monthsBetween(client.startDate, nowISO) : 0;
  const avgMonthlyValue = retentionMonths > 0 ? lifetimeRevenue / retentionMonths : lifetimeRevenue;

  const thisKey = monthKey(nowISO);
  const lastDate = new Date(nowISO + "T00:00:00");
  lastDate.setMonth(lastDate.getMonth() - 1);
  const lastKey = lastDate.toISOString().slice(0, 7);
  const revenueThisMonth = paid.filter((s) => monthKey(s.date) === thisKey).reduce((n, s) => n + s.amount, 0);
  const revenueLastMonth = paid.filter((s) => monthKey(s.date) === lastKey).reduce((n, s) => n + s.amount, 0);
  const revenueGrowth = revenueLastMonth > 0 ? (revenueThisMonth - revenueLastMonth) / revenueLastMonth : null;

  // Last 6 calendar months of Paid revenue (oldest → newest).
  const monthlyTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowISO + "T00:00:00");
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const amount = paid.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + s.amount, 0);
    monthlyTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), amount });
  }

  const tenureScore = Math.min(retentionMonths / 12, 1);
  const revenueScore = client.monthlyRate > 0 ? Math.min(lifetimeRevenue / (client.monthlyRate * 12), 1) : 0;
  const complianceScore = (client.compliance ?? 0) / 100;
  const valueScore = Math.round(100 * (0.4 * tenureScore + 0.4 * revenueScore + 0.2 * complianceScore));

  return {
    lifetimeRevenue,
    monthlyRevenue: client.monthlyRate,
    payments,
    avgMonthlyValue: Math.round(avgMonthlyValue),
    lastPayment,
    revenueThisMonth,
    revenueLastMonth,
    revenueGrowth,
    monthlyTrend,
    retentionMonths,
    clientAgeMonths,
    valueScore,
  };
}

/* ------------------------------------------------------------------ */
/* Owner (CEO) Dashboard — portfolio-wide aggregation                  */
/* ------------------------------------------------------------------ */

export interface OwnerData {
  clients: Client[];
  sales: Sale[];
  programs: Program[];
  checkIns: CheckIn[];
  workouts: WorkoutRow[];
  coachNotes: CoachNote[];
  nutrition: NutritionLog[];
  leads: Lead[];
}

/** One fetch for the whole Owner Dashboard (each query is request-cached). */
export async function getOwnerData(): Promise<OwnerData> {
  const [clients, sales, programs, checkIns, workouts, coachNotes, nutrition, leads] =
    await Promise.all([
      getClients(),
      salesRaw(),
      programsRaw(),
      checkInsRaw(),
      workoutsRaw(),
      coachNotesRaw(),
      nutritionRaw(),
      leadsRaw(),
    ]);
  return { clients, sales, programs, checkIns, workouts, coachNotes, nutrition, leads };
}

const ACTIVE_STATUSES = new Set(["Active", "Onboarding"]);
function isActive(c: Client): boolean {
  return ACTIVE_STATUSES.has(c.status);
}

/**
 * Compute the portfolio-wide Owner (CEO) summary from the live databases plus
 * the owner's config targets. Pure — no fetching, no fabrication. Metrics that
 * have no data yet (Workout completion, Nutrition compliance) return null so the
 * UI can render an honest empty state instead of a fake zero.
 */
export function summarizePortfolio(
  data: OwnerData,
  config: OwnerConfig = getOwnerConfig(),
  nowISO: string = new Date().toISOString().slice(0, 10),
): OwnerSummary {
  const { clients, sales, programs, checkIns, workouts, coachNotes, nutrition, leads } = data;
  const nameOf = new Map(clients.map((c) => [c.id, c] as const));
  const active = clients.filter(isActive);
  const paid = sales.filter((s) => s.paymentStatus === "Paid");

  /* Revenue -------------------------------------------------------- */
  const mrr = active.reduce((n, c) => n + c.monthlyRate, 0);
  const arr = mrr * 12;
  const thisKey = monthKey(nowISO);
  const lastDate = new Date(nowISO + "T00:00:00");
  lastDate.setMonth(lastDate.getMonth() - 1);
  const lastKey = lastDate.toISOString().slice(0, 7);
  const monthlyRevenue = paid.filter((s) => monthKey(s.date) === thisKey).reduce((n, s) => n + s.amount, 0);
  const revenueLastMonth = paid.filter((s) => monthKey(s.date) === lastKey).reduce((n, s) => n + s.amount, 0);
  const revenueGrowth = revenueLastMonth > 0 ? (monthlyRevenue - revenueLastMonth) / revenueLastMonth : null;
  const revenueGoal = config.revenueGoal;
  const revenueRemaining = Math.max(0, revenueGoal - monthlyRevenue);
  const goalProgress = revenueGoal > 0 ? Math.min(100, Math.round((monthlyRevenue / revenueGoal) * 100)) : 0;

  const revenueTrend: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowISO + "T00:00:00");
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const amount = paid.filter((s) => monthKey(s.date) === key).reduce((n, s) => n + s.amount, 0);
    revenueTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), amount });
  }

  /* Clients -------------------------------------------------------- */
  const activeClients = active.length;
  const newClientsThisMonth = clients.filter((c) => c.startDate && monthKey(c.startDate) === thisKey).length;
  const clientCapacity = config.clientCapacity;
  const capacityFill = clientCapacity > 0 ? Math.min(100, Math.round((activeClients / clientCapacity) * 100)) : 0;
  const pausedClients = clients.filter((c) => c.status === "Paused" || c.billingStatus === "Paused").length;
  const pastDueClients = clients.filter((c) => c.billingStatus === "Past Due").length;
  const cancelledClients = clients.filter((c) => c.status === "Churned" || c.billingStatus === "Cancelled").length;
  const avgClientValue = activeClients > 0 ? Math.round(mrr / activeClients) : 0;

  const churnedClients = clients.filter((c) => c.status === "Churned" || c.cancelledDate);
  const lifetimeBasis = churnedClients.length ? churnedClients : clients;
  const avgClientLifetimeMonths = lifetimeBasis.length
    ? Math.round(
        lifetimeBasis.reduce((n, c) => n + monthsBetween(c.startDate, c.cancelledDate || nowISO), 0) /
          lifetimeBasis.length,
      )
    : 0;

  const churnedThisMonth = clients.filter((c) => c.cancelledDate && monthKey(c.cancelledDate) === thisKey).length;
  const churnBase = activeClients + churnedThisMonth;
  const churnRate = churnBase > 0 ? churnedThisMonth / churnBase : null;

  const clientGrowthTrend: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nowISO + "T00:00:00");
    d.setMonth(d.getMonth() - i);
    const end = d.toISOString().slice(0, 7) + "-28"; // month boundary (safe day)
    const count = clients.filter(
      (c) => c.startDate && c.startDate <= end && (!c.cancelledDate || c.cancelledDate > end),
    ).length;
    clientGrowthTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count });
  }

  /* Health --------------------------------------------------------- */
  const portfolioCompliance = active.length
    ? Math.round(active.reduce((n, c) => n + (c.compliance ?? 0), 0) / active.length)
    : 0;
  const workoutCompletion = workouts.length
    ? Math.round((workouts.filter((w) => w.completed).length / workouts.length) * 100)
    : null;
  const nutritionCompliance = nutrition.length
    ? Math.round(nutrition.reduce((n, x) => n + (x.compliance ?? 0), 0) / nutrition.length)
    : null;

  const topClients: TopClient[] = [...clients]
    .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.avatarInitials,
      lifetimeRevenue: c.lifetimeRevenue,
      monthlyRate: c.monthlyRate,
    }));

  const recentPayments = [...paid].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const upcomingPayments: UpcomingPayment[] = active
    .filter((c) => c.nextPaymentDate && (dayDiff(nowISO, c.nextPaymentDate) ?? -1) >= 0)
    .sort((a, b) => (a.nextPaymentDate! < b.nextPaymentDate! ? -1 : 1))
    .slice(0, 6)
    .map((c) => ({
      clientId: c.id,
      name: c.name,
      initials: c.avatarInitials,
      date: c.nextPaymentDate!,
      amount: c.monthlyRate,
    }));

  /* Operations ----------------------------------------------------- */
  const programsActive = programs.filter((p) => p.status === "Active").length;
  const programsEnding = programs.filter(
    (p) => p.status === "Active" && p.endDate && withinNextDays(p.endDate, nowISO, config.endingSoonDays),
  ).length;
  const pendingNotes = coachNotes.filter((n) => n.status === "New" || n.status === "In Progress").length;
  const openAiRecs = coachNotes.filter((n) => n.type === "AI Recommendation" && n.status === "New").length;
  const nutritionPlans = new Set(nutrition.map((n) => n.clientId)).size;
  const completedCheckIns = checkIns.filter((c) => c.status === "Reviewed" && monthKey(c.date) === thisKey).length;

  /* Recent activity feed ------------------------------------------- */
  const activity: ActivityItem[] = [
    ...paid.map((s): ActivityItem => ({
      id: `pay_${s.id}`,
      type: "payment",
      date: s.date,
      title: `Payment · ${s.amount}`,
      detail: nameOf.get(s.clientId)?.name ?? s.package ?? "",
      clientId: s.clientId,
    })),
    ...checkIns.map((c): ActivityItem => ({
      id: `ci_${c.id}`,
      type: "checkin",
      date: c.date,
      title: "Check-in",
      detail: `${nameOf.get(c.clientId)?.name ?? "Client"} · ${c.compliance}% compliance`,
      clientId: c.clientId,
    })),
    ...coachNotes.map((n): ActivityItem => ({
      id: `note_${n.id}`,
      type: "note",
      date: n.created,
      title: n.type,
      detail: `${nameOf.get(n.clientId)?.name ?? "Client"} · ${n.body.slice(0, 60)}`,
      clientId: n.clientId,
    })),
    ...clients
      .filter((c) => c.startDate)
      .map((c): ActivityItem => ({
        id: `client_${c.id}`,
        type: "client",
        date: c.startDate,
        title: "New client",
        detail: c.name,
        clientId: c.id,
      })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  /* Today's priorities --------------------------------------------- */
  const priorities: PriorityGroup[] = [];
  const push = (key: string, label: string, tone: PriorityGroup["tone"], items: PriorityItem[]) => {
    if (items.length) priorities.push({ key, label, tone, items });
  };
  const toItem = (c: Client, detail: string): PriorityItem => ({
    clientId: c.id,
    name: c.name,
    initials: c.avatarInitials,
    detail,
  });

  push(
    "checkin-overdue",
    "Check-in overdue",
    "red",
    active
      .filter((c) => {
        const d = c.lastCheckIn ? dayDiff(c.lastCheckIn, nowISO) : null;
        return d !== null && d > config.checkInOverdueDays;
      })
      .map((c) => toItem(c, `${dayDiff(c.lastCheckIn, nowISO)}d since check-in`)),
  );

  push(
    "past-due",
    "Past-due payments",
    "red",
    clients.filter((c) => c.billingStatus === "Past Due").map((c) => toItem(c, "Payment past due")),
  );

  const endingItems: PriorityItem[] = programs
    .filter((p) => p.status === "Active" && p.endDate && withinNextDays(p.endDate, nowISO, config.endingSoonDays))
    .map((p) => {
      const c = nameOf.get(p.clientId);
      const days = dayDiff(nowISO, p.endDate);
      return c ? toItem(c, `${p.name} ends in ${days}d`) : null;
    })
    .filter((x): x is PriorityItem => x !== null);
  push("programs-ending", "Programs ending soon", "amber", endingItems);

  const clientsWithActiveProgram = new Set(
    programs.filter((p) => p.status === "Active").map((p) => p.clientId),
  );
  push(
    "no-program",
    "No active program",
    "amber",
    active.filter((c) => !clientsWithActiveProgram.has(c.id)).map((c) => toItem(c, "No program assigned")),
  );

  push(
    "renewals",
    "Upcoming renewals",
    "sky",
    active
      .filter((c) => c.renewalDate && withinNextDays(c.renewalDate, nowISO, config.upcomingDays))
      .map((c) => toItem(c, `Renews in ${dayDiff(nowISO, c.renewalDate)}d`)),
  );

  // Declining compliance: latest check-in below the previous one (needs ≥2).
  const decliningItems: PriorityItem[] = active
    .map((c) => {
      const cis = checkIns
        .filter((x) => x.clientId === c.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      if (cis.length >= 2 && cis[0].compliance < cis[1].compliance) {
        return toItem(c, `${cis[1].compliance}% → ${cis[0].compliance}%`);
      }
      return null;
    })
    .filter((x): x is PriorityItem => x !== null);
  push("declining", "Declining compliance", "amber", decliningItems);

  const clientsWithWorkouts = new Set(workouts.map((w) => w.clientId));
  push(
    "no-workouts",
    "No workouts logged",
    "sky",
    active.filter((c) => !clientsWithWorkouts.has(c.id)).map((c) => toItem(c, "No workout data")),
  );

  const clientsWithNutrition = new Set(nutrition.map((n) => n.clientId));
  push(
    "no-nutrition",
    "No nutrition logs",
    "sky",
    active.filter((c) => !clientsWithNutrition.has(c.id)).map((c) => toItem(c, "No nutrition data")),
  );

  const newPaymentsToday = paid
    .filter((s) => s.date === nowISO)
    .map((s) => {
      const c = nameOf.get(s.clientId);
      return c ? toItem(c, `Paid ${s.amount}`) : null;
    })
    .filter((x): x is PriorityItem => x !== null);
  push("new-payments", "New payments today", "emerald", newPaymentsToday);

  /* Calendar (next `upcomingDays` days) ---------------------------- */
  const calendar: CalendarEvent[] = [];
  const addEvent = (date: string, type: CalendarEvent["type"], label: string, detail?: string) => {
    if (date && withinNextDays(date, nowISO, config.upcomingDays)) calendar.push({ date, type, label, detail });
  };
  for (const c of active) {
    // Weekly check-in due = last check-in + 7 days.
    if (c.lastCheckIn) {
      const due = new Date(c.lastCheckIn + "T00:00:00");
      due.setDate(due.getDate() + 7);
      addEvent(due.toISOString().slice(0, 10), "Check-in", c.name, "Weekly check-in due");
    }
    if (c.nextPaymentDate) addEvent(c.nextPaymentDate, "Payment", c.name, `${c.monthlyRate}`);
    if (c.renewalDate) addEvent(c.renewalDate, "Renewal", c.name);
    // Birthday recurs annually — check this year's and next year's occurrence so
    // a fixed date-of-birth surfaces when it falls inside the window.
    if (c.birthday && c.birthday.length >= 10) {
      const mmdd = c.birthday.slice(5, 10);
      const year = Number(nowISO.slice(0, 4));
      for (const y of [year, year + 1]) {
        const occ = `${y}-${mmdd}`;
        if (withinNextDays(occ, nowISO, config.upcomingDays)) {
          addEvent(occ, "Birthday", c.name, "🎂 Birthday");
          break;
        }
      }
    }
  }
  for (const l of leads) {
    if (l.stage === "Call Scheduled" && l.nextFollowUp) addEvent(l.nextFollowUp, "Consultation", l.name, l.nextAction);
  }
  for (const p of programs) {
    const c = nameOf.get(p.clientId);
    if (p.startDate) addEvent(p.startDate, "Program Start", c?.name ?? p.name, p.name);
    if (p.endDate) addEvent(p.endDate, "Program End", c?.name ?? p.name, p.name);
  }
  calendar.sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    mrr,
    arr,
    monthlyRevenue,
    revenueLastMonth,
    revenueGrowth,
    revenueGoal,
    revenueRemaining,
    goalProgress,
    revenueTrend,
    activeClients,
    newClientsThisMonth,
    clientCapacity,
    capacityFill,
    pausedClients,
    pastDueClients,
    cancelledClients,
    avgClientValue,
    avgClientLifetimeMonths,
    churnRate,
    clientGrowthTrend,
    portfolioCompliance,
    workoutCompletion,
    nutritionCompliance,
    topClients,
    recentPayments,
    upcomingPayments,
    programsActive,
    programsEnding,
    pendingNotes,
    openAiRecs,
    nutritionPlans,
    completedCheckIns,
    activity,
    priorities,
    calendar,
  };
}

/**
 * Notion-backed weekly nutrition logs for a client (newest first). Empty until
 * rows exist — the Nutrition module then shows a clean empty state. Distinct
 * from the sample-only `nutritionForClient` used by the prototype portal.
 */
export async function nutritionLogsForClient(clientId: string): Promise<NutritionLog[]> {
  const all = await nutritionRaw();
  return all
    .filter((n) => n.clientId === clientId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Coach notes + AI recommendations for a client (newest first), from Notion. */
export async function coachNotesForClient(clientId: string): Promise<CoachNote[]> {
  const all = await coachNotesRaw();
  return all
    .filter((n) => n.clientId === clientId)
    .sort((a, b) => (a.created < b.created ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Coach-dashboard resources                                           */
/* ------------------------------------------------------------------ */

export async function getLeads(): Promise<Lead[]> {
  return leadsRaw();
}

export async function getSales(): Promise<Sale[]> {
  return salesRaw();
}

export async function getContent(): Promise<ContentItem[]> {
  return contentRaw();
}

export async function getMetrics(): Promise<Metric[]> {
  return [...(await metricsRaw())].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Prototype-only data (no Notion database yet) — sample, per client   */
/* Falls back to the demo client so live clients still see content.    */
/* ------------------------------------------------------------------ */

export function nutritionForClient(clientId: string): NutritionPlan | undefined {
  return sample.nutritionForClient(clientId) ?? sample.nutritionForClient(sample.CURRENT_CLIENT_ID);
}

export function progressForClient(clientId: string): ProgressPoint[] {
  const own = sample.progressForClient(clientId);
  return own.length ? own : sample.progressForClient(sample.CURRENT_CLIENT_ID);
}

export function messagesForClient(clientId: string): Message[] {
  const own = sample.messagesForClient(clientId);
  return own.length ? own : sample.messagesForClient(sample.CURRENT_CLIENT_ID);
}

export function prioritiesForClient(clientId: string): WeeklyPriority[] {
  const own = sample.prioritiesForClient(clientId);
  return own.length ? own : sample.prioritiesForClient(sample.CURRENT_CLIENT_ID);
}
