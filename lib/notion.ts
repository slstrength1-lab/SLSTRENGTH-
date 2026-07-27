/**
 * Notion adapter — the single connection point between the SL Strength OS UI
 * and the live Notion backend.
 *
 * Behaviour:
 *   - If NOTION_API_KEY is set  → query the real Notion data sources and map
 *     each page to the TypeScript interfaces in `types.ts`.
 *   - If the key is missing, or any query fails → fall back to the bundled
 *     sample data so the prototype always renders. Connection status and
 *     per-query failures are logged to the server console.
 *
 * Only this file talks to Notion. The UI and API routes call `notion.getX()`
 * and receive the same shapes regardless of mode, so nothing else changes when
 * the backend goes live.
 *
 * Uses @notionhq/client v5 (Notion API version 2025-09-03), which queries by
 * *data source* id via `client.dataSources.query`.
 */

import { Client as NotionClient } from "@notionhq/client";
import * as sample from "./data";
import type {
  Client,
  ClientStatus,
  RiskLevel,
  CoachingFocus,
  Lead,
  LeadStage,
  Sale,
  PaymentType,
  PaymentStatus,
  CheckIn,
  CheckInStatus,
  RatingLow,
  SleepRating,
  Program,
  ProgramType,
  ProgramPhase,
  ProgramStatus,
  ContentItem,
  ContentPillar,
  ContentStatus,
  Metric,
  WorkoutRow,
  BillingStatus,
  NutritionLog,
  CoachNote,
} from "./types";

/** Data source IDs from the live SL Strength OS Notion workspace. */
export const NOTION_DATA_SOURCES = {
  clients: "002ab021-86fe-43ed-b0c5-6de2ae845d48",
  leads: "a7d125f8-b72a-4b17-8f54-5735e4fce805",
  sales: "7f1cdeda-694e-4104-b4fe-8a49de234832",
  checkins: "54ba94b6-2204-48ef-824f-ad669a1f3660",
  programs: "aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481",
  content: "7b9428d8-9f4f-48c8-95d6-9a95bef9fc1f",
  metrics: "b456da35-4b5d-4870-a802-5c699d350855",
  workouts: "7f5e8a76-c1f1-4f66-856b-122ea2e9904c",
  nutrition: "7fef8dfe-692d-4e5f-af53-b592f1d0a672",
  coachNotes: "6ec70405-6d57-4abf-ab6b-7131aa403a48",
} as const;

/** True once NOTION_API_KEY is configured. */
export const isLive = Boolean(process.env.NOTION_API_KEY);

let _client: NotionClient | null = null;
function getClient(): NotionClient {
  if (!_client) _client = new NotionClient({ auth: process.env.NOTION_API_KEY });
  return _client;
}

let _announced = false;
function announce(): void {
  if (_announced) return;
  _announced = true;
  if (isLive) {
    console.info("[notion] Live mode — NOTION_API_KEY detected. Notion is the source of truth.");
  } else {
    console.info("[notion] Sample mode — NOTION_API_KEY not set. Serving bundled sample data.");
  }
}

/* ------------------------------------------------------------------ */
/* Property readers (tolerant of missing / differently-typed props)    */
/* ------------------------------------------------------------------ */

type Prop = any;
type Props = Record<string, Prop>;

const text = (p: Prop): string =>
  ((p?.title ?? p?.rich_text ?? []) as Prop[]).map((t) => t.plain_text).join("").trim();

const select = (p: Prop): string | null => p?.select?.name ?? p?.status?.name ?? null;

const multi = (p: Prop): string[] => ((p?.multi_select ?? []) as Prop[]).map((s) => s.name);

const number = (p: Prop): number | null => {
  if (typeof p?.number === "number") return p.number;
  if (p?.rollup?.type === "number" && typeof p.rollup.number === "number") return p.rollup.number;
  if (p?.formula?.type === "number" && typeof p.formula.number === "number") return p.formula.number;
  return null;
};

const dateStr = (p: Prop): string | null =>
  p?.date?.start ?? p?.rollup?.date?.start ?? p?.formula?.date?.start ?? null;

const email = (p: Prop): string => p?.email ?? "";
const phone = (p: Prop): string => p?.phone_number ?? "";
const url = (p: Prop): string => p?.url ?? "";
const checkbox = (p: Prop): boolean => Boolean(p?.checkbox);
const createdTime = (p: Prop): string => p?.created_time ?? "";
const relationIds = (p: Prop): string[] => ((p?.relation ?? []) as Prop[]).map((r) => r.id);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------------------------------------------ */
/* Mappers: Notion page -> domain model                                */
/* ------------------------------------------------------------------ */

function mapClient(page: Prop): Client {
  const p: Props = page.properties;
  const name = text(p["Name"]) || "Unnamed client";
  return {
    id: page.id,
    notionId: page.id,
    name,
    email: email(p["Email"]),
    avatarInitials: initials(name),
    status: (select(p["Status"]) as ClientStatus) ?? "Active",
    coachingFocus: multi(p["Coaching Focus"]) as CoachingFocus[],
    startDate: dateStr(p["Start Date"]) ?? "",
    renewalDate: dateStr(p["Renewal Date"]) ?? "",
    monthlyRate: number(p["Monthly Rate"]) ?? 0,
    primaryGoal: text(p["Primary Goal"]),
    riskLevel: (select(p["Risk Level"]) as RiskLevel) ?? "Green",
    source: select(p["Source"]) ?? "",
    // Phase is not stored on Clients — enriched from the active Program in store.ts.
    currentPhase: "Foundation",
    compliance: Math.round(number(p["Avg Compliance %"]) ?? 0),
    lastCheckIn: dateStr(p["Last Check-In"]) ?? dateStr(p["Start Date"]) ?? "",
    lifetimeRevenue: number(p["Lifetime Revenue"]) ?? 0,
    billingStatus: (select(p["Billing Status"]) as BillingStatus) ?? undefined,
    plan: select(p["Plan"]) ?? undefined,
    nextPaymentDate: dateStr(p["Next Payment Date"]) ?? undefined,
    avgNutritionCompliance: number(p["Avg Nutrition Compliance"]) ?? undefined,
    lastNutritionLog: dateStr(p["Last Nutrition Log"]) ?? undefined,
  };
}

function mapNutrition(page: Prop): NutritionLog {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    clientId: relationIds(p["Client"])[0] ?? "",
    date: dateStr(p["Date"]) ?? "",
    strategy: text(p["Strategy"]),
    targetCalories: number(p["Target Calories"]) ?? 0,
    protein: number(p["Protein (g)"]) ?? 0,
    carbs: number(p["Carbs (g)"]) ?? 0,
    fat: number(p["Fat (g)"]) ?? 0,
    caloriesActual: number(p["Calories Actual"]) ?? 0,
    compliance: number(p["Compliance %"]) ?? 0,
    notes: text(p["Notes"]) || undefined,
  };
}

function mapCoachNote(page: Prop): CoachNote {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    clientId: relationIds(p["Client"])[0] ?? "",
    created: dateStr(p["Created"]) || createdTime(p["Created"]) || page.created_time || "",
    author: text(p["Author"]),
    type: (select(p["Type"]) as CoachNote["type"]) ?? "Note",
    body: text(p["Body"]),
    status: (select(p["Status"]) as CoachNote["status"]) ?? "New",
    priority: (select(p["Priority"]) as CoachNote["priority"]) ?? undefined,
  };
}

function mapLead(page: Prop): Lead {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    name: text(p["Name"]) || "Unnamed lead",
    stage: (select(p["Stage"]) as LeadStage) ?? "New",
    email: email(p["Email"]),
    source: select(p["Source"]) ?? "",
    interest: multi(p["Interest"]) as CoachingFocus[],
    estValue: number(p["Est. Value"]) ?? 0,
    nextFollowUp: dateStr(p["Next Follow-up"]) ?? "",
    nextAction: text(p["Next Action"]),
    notes: text(p["Notes"]),
    goal: text(p["Goal"]),
    problem: text(p["Problem"]),
  };
}

function mapSale(page: Prop): Sale {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    title: text(p["Sale"]) || "Sale",
    clientId: relationIds(p["Client"])[0] ?? "",
    amount: number(p["Amount"]) ?? 0,
    date: dateStr(p["Date"]) ?? "",
    package: select(p["Package"]) ?? "",
    paymentType: (select(p["Payment Type"]) as PaymentType) ?? "Monthly",
    paymentStatus: (select(p["Payment Status"]) as PaymentStatus) ?? "Paid",
  };
}

function mapCheckIn(page: Prop): CheckIn {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    title: text(p["Check-in"]) || "Check-in",
    clientId: relationIds(p["Client"])[0] ?? "",
    date: dateStr(p["Date"]) ?? "",
    bodyweight: number(p["Bodyweight"]) ?? 0,
    compliance: number(p["Compliance %"]) ?? 0,
    energy: (select(p["Energy"]) as RatingLow) ?? "Moderate",
    sleep: (select(p["Sleep"]) as SleepRating) ?? "Okay",
    stress: (select(p["Stress"]) as RatingLow) ?? "Moderate",
    wins: text(p["Wins"]),
    challenges: text(p["Challenges"]),
    notes: text(p["Notes"]),
    adjustments: text(p["Adjustments"]),
    status: (select(p["Status"]) as CheckInStatus) ?? "Submitted",
  };
}

function mapProgram(page: Prop): Program {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    name: text(p["Program"]) || "Program",
    clientId: relationIds(p["Client"])[0] ?? "",
    type: (select(p["Type"]) as ProgramType) ?? "General",
    phase: (select(p["Phase"]) as ProgramPhase) ?? "Foundation",
    startDate: dateStr(p["Start Date"]) ?? "",
    endDate: dateStr(p["End Date"]) ?? "",
    status: (select(p["Status"]) as ProgramStatus) ?? "Active",
    link: url(p["Program Link"]) || undefined,
    // The granular week/day/exercise structure lives in the linked spreadsheet,
    // not in Notion — store.ts supplies a template so the Training page renders.
    weeks: [],
  };
}

function mapContent(page: Prop): ContentItem {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    title: text(p["Title"]) || "Untitled",
    platform: multi(p["Platform"]),
    format: select(p["Format"]) ?? "",
    pillar: (select(p["Pillar"]) as ContentPillar) ?? "Education",
    status: (select(p["Status"]) as ContentStatus) ?? "Idea",
    publishDate: dateStr(p["Publish Date"]) ?? "",
    hookNotes: text(p["Hook / Notes"]),
  };
}

function mapMetric(page: Prop): Metric {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    period: text(p["Period"]) || "Week",
    weekOf: dateStr(p["Week Of"]) ?? "",
    activeClients: number(p["Active Clients"]) ?? 0,
    newLeads: number(p["New Leads"]) ?? 0,
    newClients: number(p["New Clients"]) ?? 0,
    revenue: number(p["Revenue"]) ?? 0,
    mrr: number(p["MRR"]) ?? 0,
    churned: number(p["Churned"]) ?? 0,
    contentPublished: number(p["Content Published"]) ?? 0,
    calls: number(p["Calls"]) ?? 0,
    closeRate: number(p["Close Rate %"]) ?? 0,
    retention: number(p["Retention %"]) ?? 0,
  };
}

function mapWorkout(page: Prop): WorkoutRow {
  const p: Props = page.properties;
  const actualLoad = number(p["Actual Load (lb)"]);
  const actualReps = number(p["Actual Reps"]);
  const rpe = number(p["RPE"]);
  return {
    id: page.id,
    notionId: page.id,
    programId: relationIds(p["Program"])[0] ?? "",
    clientId: relationIds(p["Client"])[0] ?? "",
    week: number(p["Week"]) ?? 0,
    day: number(p["Day"]) ?? 0,
    focus: text(p["Focus"]),
    order: number(p["Order"]) ?? 0,
    exercise: text(p["Exercise"]) || "Exercise",
    sets: number(p["Sets"]) ?? 0,
    reps: text(p["Reps"]),
    load: text(p["Load"]),
    actualLoad: actualLoad ?? undefined,
    actualReps: actualReps ?? undefined,
    rpe: rpe ?? undefined,
    tempo: text(p["Tempo"]) || undefined,
    completed: checkbox(p["Completed"]),
    date: dateStr(p["Date"]) ?? undefined,
    notes: text(p["Notes"]) || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Query + fallback                                                    */
/* ------------------------------------------------------------------ */

async function queryAll(dataSourceId: string): Promise<Prop[]> {
  const client = getClient();
  const results: Prop[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: Prop = await client.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return results;
}

async function fetchOrFallback<T>(
  label: string,
  dataSourceId: string,
  mapper: (page: Prop) => T,
  fallback: T[],
): Promise<T[]> {
  announce();
  if (!isLive) return fallback;
  try {
    const pages = await queryAll(dataSourceId);
    return pages.map(mapper);
  } catch (err) {
    console.warn(
      `[notion] ${label} query failed — falling back to sample data:`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Write layer — create/update Notion records (sample fallback)        */
/* ------------------------------------------------------------------ */

// Notion property-value builders for pages.create / pages.update.
const wTitle = (s: string) => ({ title: [{ text: { content: s } }] });
const wRich = (s?: string) => ({ rich_text: s ? [{ text: { content: s } }] : [] });
const wNum = (n?: number) => ({ number: typeof n === "number" ? n : null });
const wSel = (name?: string) => (name ? { select: { name } } : { select: null });
const wMulti = (names: string[]) => ({ multi_select: names.map((name) => ({ name })) });
const wDate = (start?: string) => (start ? { date: { start } } : { date: null });
const wRel = (ids: string[]) => ({ relation: ids.map((id) => ({ id })) });
const wEmail = (s?: string) => ({ email: s || null });

const today = (): string => new Date().toISOString().slice(0, 10);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

let _seq = 0;
function localId(prefix: string): string {
  _seq += 1;
  return `local_${prefix}_${_seq}`;
}
/** Prepend to a sample array so it shows up immediately on the next read. */
function sampleInsert<T>(arr: T[], item: T): T {
  arr.unshift(item);
  return item;
}

async function createPage(dataSourceId: string, properties: Record<string, unknown>): Promise<Prop> {
  const args: Prop = {
    parent: { type: "data_source_id", data_source_id: dataSourceId },
    properties,
  };
  return getClient().pages.create(args);
}

/* ---- Input payloads --------------------------------------------- */

export interface CheckInInput {
  clientId: string;
  clientName?: string;
  date?: string;
  bodyweight: number;
  compliance: number;
  energy: RatingLow;
  sleep: SleepRating;
  stress: RatingLow;
  wins?: string;
  challenges?: string;
  notes?: string;
}

export interface LeadInput {
  name: string;
  contact?: string;
  source?: string;
  goal?: string;
  problem?: string;
  status?: LeadStage;
}

export interface ProgramInput {
  clientId: string;
  clientName?: string;
  type: ProgramType;
  phase: ProgramPhase;
  startDate?: string;
  endDate?: string;
  name?: string;
}

export interface NutritionInput {
  clientId: string;
  clientName?: string;
  date?: string;
  strategy?: string;
  targetCalories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  caloriesActual?: number;
  compliance?: number;
  notes?: string;
}

export interface CoachNoteInput {
  clientId: string;
  body: string;
  author?: string;
  type?: CoachNote["type"];
  status?: CoachNote["status"];
  priority?: CoachNote["priority"];
}

/* ---- 1. Check-in submission -------------------------------------- */

async function createCheckIn(input: CheckInInput): Promise<CheckIn> {
  announce();
  const date = input.date ?? today();
  const record: CheckIn = {
    id: localId("ci"),
    title: `${input.clientName ?? "Check-in"} — ${date}`,
    clientId: input.clientId,
    date,
    bodyweight: input.bodyweight,
    compliance: input.compliance,
    energy: input.energy,
    sleep: input.sleep,
    stress: input.stress,
    wins: input.wins ?? "",
    challenges: input.challenges ?? "",
    notes: input.notes ?? "",
    adjustments: "",
    status: "Submitted",
  };
  if (!isLive) return sampleInsert(sample.checkIns, record);
  try {
    const props: Record<string, unknown> = {
      "Check-in": wTitle(record.title),
      Date: wDate(date),
      Bodyweight: wNum(record.bodyweight),
      "Compliance %": wNum(record.compliance),
      Energy: wSel(record.energy),
      Sleep: wSel(record.sleep),
      Stress: wSel(record.stress),
      Wins: wRich(record.wins),
      Challenges: wRich(record.challenges),
      Notes: wRich(record.notes),
      Status: wSel("Submitted"),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    return mapCheckIn(await createPage(NOTION_DATA_SOURCES.checkins, props));
  } catch (err) {
    console.warn("[notion] createCheckIn failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.checkIns, record);
  }
}

/* ---- 2. Lead creation -------------------------------------------- */

async function createLead(input: LeadInput): Promise<Lead> {
  announce();
  const record: Lead = {
    id: localId("ld"),
    name: input.name,
    stage: input.status ?? "New",
    email: input.contact ?? "",
    source: input.source ?? "",
    interest: [],
    estValue: 0,
    nextFollowUp: "",
    nextAction: "",
    notes: "",
    goal: input.goal ?? "",
    problem: input.problem ?? "",
  };
  if (!isLive) return sampleInsert(sample.leads, record);
  try {
    const props: Record<string, unknown> = {
      Name: wTitle(record.name),
      Stage: wSel(record.stage),
      Email: wEmail(record.email),
      Source: wSel(record.source || undefined),
      Goal: wRich(record.goal),
      Problem: wRich(record.problem),
    };
    return mapLead(await createPage(NOTION_DATA_SOURCES.leads, props));
  } catch (err) {
    console.warn("[notion] createLead failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.leads, record);
  }
}

/* ---- 3. Client creation on Closed Won ---------------------------- */

function clientRecordFromLead(lead: Lead): Client {
  return {
    id: localId("cl"),
    name: lead.name,
    email: lead.email,
    avatarInitials: initials(lead.name),
    status: "Onboarding",
    coachingFocus: lead.interest,
    startDate: today(),
    renewalDate: "",
    monthlyRate: 0,
    primaryGoal: lead.goal ?? "",
    riskLevel: "Green",
    source: lead.source,
    currentPhase: "Foundation",
    compliance: 0,
    lastCheckIn: today(),
    lifetimeRevenue: 0,
  };
}

async function createClientFromLead(lead: Lead): Promise<Client> {
  const record = clientRecordFromLead(lead);
  if (!isLive) return sampleInsert(sample.clients, record);
  const props: Record<string, unknown> = {
    Name: wTitle(record.name),
    "Primary Goal": wRich(record.primaryGoal),
    Source: wSel(record.source || undefined),
    "Coaching Focus": wMulti(record.coachingFocus),
    Status: wSel("Onboarding"),
    Email: wEmail(record.email),
  };
  // Link the originating lead (dual relation also back-links the lead).
  if (lead.id && !lead.id.startsWith("local_")) props["Original Lead"] = wRel([lead.id]);
  return mapClient(await createPage(NOTION_DATA_SOURCES.clients, props));
}

async function updateLeadStage(
  id: string,
  stage: LeadStage,
): Promise<{ lead: Lead; client?: Client }> {
  announce();
  const sampleUpdate = (): { lead: Lead; client?: Client } => {
    const lead = sample.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`Lead ${id} not found in sample memory`);
    lead.stage = stage;
    const client =
      stage === "Closed Won"
        ? sampleInsert(sample.clients, clientRecordFromLead(lead))
        : undefined;
    return { lead, client };
  };

  if (!isLive) return sampleUpdate();
  try {
    const client = getClient();
    await client.pages.update({ page_id: id, properties: { Stage: wSel(stage) } } as Prop);
    const lead = mapLead(await client.pages.retrieve({ page_id: id }));
    const newClient = stage === "Closed Won" ? await createClientFromLead(lead) : undefined;
    return { lead, client: newClient };
  } catch (err) {
    console.warn("[notion] updateLeadStage failed — updating sample memory:", errMsg(err));
    return sampleUpdate();
  }
}

/* ---- 4. Program assignment --------------------------------------- */

async function createProgram(input: ProgramInput): Promise<Program> {
  announce();
  const record: Program = {
    id: localId("pr"),
    name: input.name ?? `${input.type} Block`,
    clientId: input.clientId,
    type: input.type,
    phase: input.phase,
    startDate: input.startDate ?? today(),
    endDate: input.endDate ?? "",
    status: "Active",
    weeks: [],
  };
  if (!isLive) return sampleInsert(sample.programs, record);
  try {
    const props: Record<string, unknown> = {
      Program: wTitle(record.name),
      Type: wSel(record.type),
      Phase: wSel(record.phase),
      "Start Date": wDate(record.startDate),
      "End Date": wDate(record.endDate || undefined),
      Status: wSel("Active"),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    return mapProgram(await createPage(NOTION_DATA_SOURCES.programs, props));
  } catch (err) {
    console.warn("[notion] createProgram failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.programs, record);
  }
}

/* ---- 5. Nutrition log -------------------------------------------- */

async function createNutritionLog(input: NutritionInput): Promise<NutritionLog> {
  announce();
  const date = input.date ?? today();
  const record: NutritionLog = {
    id: localId("nu"),
    clientId: input.clientId,
    date,
    strategy: input.strategy ?? "",
    targetCalories: input.targetCalories ?? 0,
    protein: input.protein ?? 0,
    carbs: input.carbs ?? 0,
    fat: input.fat ?? 0,
    caloriesActual: input.caloriesActual ?? 0,
    compliance: input.compliance ?? 0,
    notes: input.notes,
  };
  if (!isLive) return record;
  try {
    const props: Record<string, unknown> = {
      "Nutrition Log": wTitle(`${input.clientName ?? "Nutrition"} — ${date}`),
      Date: wDate(date),
      Strategy: wRich(record.strategy),
      "Target Calories": wNum(record.targetCalories),
      "Protein (g)": wNum(record.protein),
      "Carbs (g)": wNum(record.carbs),
      "Fat (g)": wNum(record.fat),
      "Calories Actual": wNum(record.caloriesActual),
      "Compliance %": wNum(record.compliance),
      Notes: wRich(record.notes),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    return mapNutrition(await createPage(NOTION_DATA_SOURCES.nutrition, props));
  } catch (err) {
    console.warn("[notion] createNutritionLog failed — returning local record:", errMsg(err));
    return record;
  }
}

/* ---- 6. Coach note / AI recommendation --------------------------- */

async function createCoachNote(input: CoachNoteInput): Promise<CoachNote> {
  announce();
  const record: CoachNote = {
    id: localId("cn"),
    clientId: input.clientId,
    created: new Date().toISOString(),
    author: input.author ?? "Shane Lanteigne",
    type: input.type ?? "Note",
    body: input.body,
    status: input.status ?? "New",
    priority: input.priority,
  };
  if (!isLive) return record;
  try {
    const title = record.body.length > 60 ? `${record.body.slice(0, 57)}…` : record.body;
    const props: Record<string, unknown> = {
      Note: wTitle(title || "Coach note"),
      Author: wRich(record.author),
      Type: wSel(record.type),
      Body: wRich(record.body),
      Status: wSel(record.status),
      Priority: wSel(record.priority),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    return mapCoachNote(await createPage(NOTION_DATA_SOURCES.coachNotes, props));
  } catch (err) {
    console.warn("[notion] createCoachNote failed — returning local record:", errMsg(err));
    return record;
  }
}

/* ------------------------------------------------------------------ */
/* Public adapter (reads + writes; same shapes, live-capable)          */
/* ------------------------------------------------------------------ */

export const notion = {
  // Reads
  getClients: (): Promise<Client[]> =>
    fetchOrFallback("clients", NOTION_DATA_SOURCES.clients, mapClient, sample.clients),
  getLeads: (): Promise<Lead[]> =>
    fetchOrFallback("leads", NOTION_DATA_SOURCES.leads, mapLead, sample.leads),
  getSales: (): Promise<Sale[]> =>
    fetchOrFallback("sales", NOTION_DATA_SOURCES.sales, mapSale, sample.sales),
  getCheckIns: (): Promise<CheckIn[]> =>
    fetchOrFallback("check-ins", NOTION_DATA_SOURCES.checkins, mapCheckIn, sample.checkIns),
  getPrograms: (): Promise<Program[]> =>
    fetchOrFallback("programs", NOTION_DATA_SOURCES.programs, mapProgram, sample.programs),
  getContent: (): Promise<ContentItem[]> =>
    fetchOrFallback("content", NOTION_DATA_SOURCES.content, mapContent, sample.content),
  getMetrics: (): Promise<Metric[]> =>
    fetchOrFallback("metrics", NOTION_DATA_SOURCES.metrics, mapMetric, sample.metrics),
  // Workouts is a new database with no sample equivalent — fall back to empty so
  // the coach view shows a clean empty state until real rows are entered.
  getWorkouts: (): Promise<WorkoutRow[]> =>
    fetchOrFallback("workouts", NOTION_DATA_SOURCES.workouts, mapWorkout, []),
  // Nutrition + Coach Notes: new databases, no sample equivalent → empty fallback.
  getNutrition: (): Promise<NutritionLog[]> =>
    fetchOrFallback("nutrition", NOTION_DATA_SOURCES.nutrition, mapNutrition, []),
  getCoachNotes: (): Promise<CoachNote[]> =>
    fetchOrFallback("coach-notes", NOTION_DATA_SOURCES.coachNotes, mapCoachNote, []),

  // Writes
  createCheckIn,
  createLead,
  updateLeadStage,
  createProgram,
  createNutritionLog,
  createCoachNote,
};
