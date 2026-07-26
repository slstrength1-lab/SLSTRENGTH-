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

function activePhase(programs: Program[], clientId: string): ProgramPhase | undefined {
  const p =
    programs.find((x) => x.clientId === clientId && x.status === "Active") ??
    programs.find((x) => x.clientId === clientId);
  return p?.phase;
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
  const programs = await programsRaw();
  const program =
    programs.find((p) => p.clientId === clientId && p.status === "Active") ??
    programs.find((p) => p.clientId === clientId);
  if (!program) return undefined;
  if (program.weeks.length > 0) return program;
  // Live programs store their weekly structure in a linked spreadsheet, not in
  // Notion — attach a sample training block so the Training page still renders.
  const template = sample.programs.find((s) => s.clientId === clientId) ?? sample.programs[0];
  return { ...program, weeks: template?.weeks ?? [] };
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
