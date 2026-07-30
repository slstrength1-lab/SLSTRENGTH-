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
 * Business logic lives in lib/analytics/* (pure). This file only fetches;
 * data flow is UI → analytics (pure) ← data from store → notion → Notion.
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
  ProgressPoint,
  Message,
  WeeklyPriority,
  Recommendation,
} from "./types";
import type { OwnerData } from "./analytics/context";
import { cookies } from "next/headers";
import { CLIENT_COOKIE, verifyToken } from "./auth/session";

// Analytics live in lib/analytics/*. Re-exported here so existing consumers that
// import compute functions from the store keep working (UI → analytics ← store).
export { summarizeBusiness, summarizeOwner } from "./analytics";

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
const recommendationsRaw = cache(() => notion.getRecommendations());

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
 * The client currently "logged in" to the portal. Resolves in order:
 *   1. the magic-link session cookie (the real logged-in client),
 *   2. NOTION_DEMO_CLIENT_EMAIL (dev / coach preview),
 *   3. the first Active client, then any.
 * Middleware already gates the portal, so by the time a page calls this a valid
 * session exists in production; the fallbacks keep local dev and coach preview
 * working without a client login.
 */
export async function getCurrentClient(): Promise<Client> {
  const clients = await getClients();
  try {
    const token = cookies().get(CLIENT_COOKIE)?.value;
    const claims = await verifyToken(token);
    if (claims) {
      const byId = clients.find((c) => c.id === claims.cid);
      if (byId) return byId;
      const byEmail = clients.find(
        (c) => c.email && c.email.toLowerCase() === claims.email.toLowerCase(),
      );
      if (byEmail) return byEmail;
    }
  } catch {
    // not in a request scope, or no cookie — fall through to defaults
  }
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
/* Owner Dashboard — one fetch, computed by lib/analytics/summarizeOwner */
/* ------------------------------------------------------------------ */

/** Fetch the whole data bundle the Owner Dashboard analyses (request-cached). */
export async function getOwnerData(): Promise<OwnerData> {
  const [clients, sales, programs, checkIns, workouts, coachNotes, nutrition, leads, content, metrics] =
    await Promise.all([
      getClients(),
      salesRaw(),
      programsRaw(),
      checkInsRaw(),
      workoutsRaw(),
      coachNotesRaw(),
      nutritionRaw(),
      leadsRaw(),
      contentRaw(),
      metricsRaw(),
    ]);
  return { clients, sales, programs, checkIns, workouts, coachNotes, nutrition, leads, content, metrics };
}

/* ------------------------------------------------------------------ */
/* Per-client Notion-backed logs                                       */
/* ------------------------------------------------------------------ */

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

/** Workout rows logged for a client (Notion Workouts DB). Empty until entered. */
export async function workoutsForClient(clientId: string): Promise<WorkoutRow[]> {
  const all = await workoutsRaw();
  return all.filter((w) => w.clientId === clientId);
}

/* ------------------------------------------------------------------ */
/* Coach-dashboard resources                                           */
/* ------------------------------------------------------------------ */

export async function getLeads(): Promise<Lead[]> {
  return leadsRaw();
}

/** A single lead by id (Lead Command Center). */
export async function getLeadById(id: string): Promise<Lead | undefined> {
  return (await leadsRaw()).find((l) => l.id === id);
}

/** Coach notes attached to a lead (newest first) — reuses the Coach Notes DB. */
export async function coachNotesForLead(leadId: string): Promise<CoachNote[]> {
  const all = await coachNotesRaw();
  return all
    .filter((n) => n.leadId === leadId)
    .sort((a, b) => (a.created < b.created ? 1 : -1));
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
/* AI Recommendations ledger (Phase 0 — approval backbone)             */
/* ------------------------------------------------------------------ */

/**
 * All recommendations (newest first), enriched with the client/lead display
 * names the ledger stores only as relations. Agents write here; the approval
 * inbox reads here. UI → analytics ← store → notion → Notion.
 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const [recs, clients, leads] = await Promise.all([recommendationsRaw(), clientsRaw(), leadsRaw()]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const leadName = new Map(leads.map((l) => [l.id, l.name]));
  return recs
    .map((r) => ({
      ...r,
      clientName: r.clientId ? clientName.get(r.clientId) : undefined,
      leadName: r.leadId ? leadName.get(r.leadId) : undefined,
    }))
    .sort((a, b) => (a.created < b.created ? 1 : -1));
}

/** A single recommendation by id. */
export async function getRecommendationById(id: string): Promise<Recommendation | undefined> {
  return (await getRecommendations()).find((r) => r.id === id);
}

/** Recommendations attached to a client (newest first). */
export async function recommendationsForClient(clientId: string): Promise<Recommendation[]> {
  return (await getRecommendations()).filter((r) => r.clientId === clientId);
}

/** Recommendations attached to a lead (newest first). */
export async function recommendationsForLead(leadId: string): Promise<Recommendation[]> {
  return (await getRecommendations()).filter((r) => r.leadId === leadId);
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
