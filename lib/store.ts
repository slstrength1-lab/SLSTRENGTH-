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
  ProgressPoint,
  Message,
  WeeklyPriority,
} from "./types";

/* Per-request cached fetchers ------------------------------------- */

const clientsRaw = cache(() => notion.getClients());
const programsRaw = cache(() => notion.getPrograms());
const checkInsRaw = cache(() => notion.getCheckIns());
const leadsRaw = cache(() => notion.getLeads());
const salesRaw = cache(() => notion.getSales());
const contentRaw = cache(() => notion.getContent());
const metricsRaw = cache(() => notion.getMetrics());
const workoutsRaw = cache(() => notion.getWorkouts());

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
