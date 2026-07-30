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
  ConversionStep,
  ConversionResult,
  Recommendation,
  RecommendationKind,
  RecommendationStatus,
  RiskTier,
  AgentSource,
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
  recommendations: "57947489-015d-4156-884c-3789476b888c",
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
// Auto-increment / unique-id property (e.g. "Lead ID"). Tolerant of the number
// living under unique_id, a plain number, or a formula/rollup.
const uniqueId = (p: Prop): number | null =>
  typeof p?.unique_id?.number === "number" ? p.unique_id.number : number(p);

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
    cancelledDate: dateStr(p["Cancelled Date"]) ?? undefined,
    avgNutritionCompliance: number(p["Avg Nutrition Compliance"]) ?? undefined,
    lastNutritionLog: dateStr(p["Last Nutrition Log"]) ?? undefined,
    birthday: dateStr(p["Birthday"]) ?? undefined,
    // Contact + training rollups already in Notion, surfaced additively (Step 6A).
    phone: phone(p["Phone"]) || undefined,
    workoutCompletion: percentRollup(p["Workout Completion %"]),
    avgRPE: number(p["Avg RPE"]) ?? undefined,
    lastWorkout: dateStr(p["Last Workout"]) ?? undefined,
    totalExercisesLogged: number(p["Total Exercises Logged"]) ?? undefined,
    totalCheckIns: number(p["Total Check-ins"]) ?? undefined,
    // Onboarding lifecycle (Step 6D) — additive reads.
    onboardingStage: (select(p["Onboarding Stage"]) as Client["onboardingStage"]) ?? undefined,
    onboardingStarted: dateStr(p["Onboarding Started"]) ?? undefined,
    onboardingCompleted: dateStr(p["Onboarding Completed"]) ?? undefined,
  };
}

/**
 * Read a Notion "percent" rollup (percent_checked / percent_*) as 0-100.
 * Those rollups return a 0-1 fraction, so a value ≤ 1 is scaled up; a value
 * already on a 0-100 scale is passed through. Undefined when absent.
 */
function percentRollup(p: Prop): number | undefined {
  const n = number(p);
  if (typeof n !== "number") return undefined;
  return Math.round(n <= 1 ? n * 100 : n);
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
    leadId: relationIds(p["Lead"])[0] ?? undefined,
    created: dateStr(p["Created"]) || createdTime(p["Created"]) || page.created_time || "",
    author: text(p["Author"]),
    type: (select(p["Type"]) as CoachNote["type"]) ?? "Coaching Note",
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
    // CRM foundation (Step 1) — additive; each is optional / undefined when blank.
    phone: phone(p["Phone"]) || undefined,
    leadId: uniqueId(p["Lead ID"]) ?? undefined,
    convertedClient: relationIds(p["Converted Client"])[0] ?? undefined,
    closeProbability: number(p["Close Probability"]) ?? undefined,
    assignedCoach: select(p["Assigned Coach"]) ?? undefined,
    lastContact: dateStr(p["Last Contact"]) ?? undefined,
    consultDate: dateStr(p["Consult Date"]) ?? undefined,
    createdDate: page.created_time ?? undefined,
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

function mapRecommendation(page: Prop): Recommendation {
  const p: Props = page.properties;
  return {
    id: page.id,
    notionId: page.id,
    title: text(p["Name"]) || "Recommendation",
    kind: (select(p["Kind"]) as RecommendationKind) ?? "Ops Task",
    source: (select(p["Source"]) as AgentSource) ?? "System",
    riskTier: (select(p["Risk Tier"]) as RiskTier) ?? "review",
    status: (select(p["Status"]) as RecommendationStatus) ?? "pending",
    summary: text(p["Summary"]),
    draft: text(p["Draft"]),
    clientId: relationIds(p["Client"])[0] || undefined,
    leadId: relationIds(p["Lead"])[0] || undefined,
    dedupKey: text(p["Dedup Key"]) || undefined,
    confidence: number(p["Confidence"]) ?? undefined,
    created: page.created_time ?? "",
    reviewed: dateStr(p["Reviewed"]) ?? undefined,
    reviewedBy: text(p["Reviewed By"]) || undefined,
    appliedResultId: text(p["Applied Result Id"]) || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Query + fallback                                                    */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Notion rate-limits bursts (~3 req/s) and returns transient 5xx. A page render
 * fires many data-source queries at once, so without retries an occasional 429
 * would make a whole list fall back to empty. Retry those with backoff; let
 * genuine errors (bad id, auth) surface immediately.
 */
function isTransient(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | undefined;
  if (e?.status && [429, 500, 502, 503, 504].includes(e.status)) return true;
  return e?.code === "rate_limited" || e?.code === "service_unavailable" || e?.code === "internal_server_error";
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts - 1 || !isTransient(err)) throw err;
      await sleep(400 * Math.pow(2, i)); // 400ms, 800ms, 1600ms
    }
  }
}

async function queryAll(dataSourceId: string): Promise<Prop[]> {
  const client = getClient();
  const results: Prop[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: Prop = await withRetry(() =>
      client.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: cursor,
        page_size: 100,
      }),
    );
    results.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return results;
}

/**
 * The reason the most recent read of each data source fell back to sample data
 * (keyed by label). Lets a page surface *why* a live-mode list came back empty
 * — usually the integration not being shared with that specific database.
 */
export const lastFetchErrors: Record<string, string> = {};

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
    delete lastFetchErrors[label];
    return pages.map(mapper);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastFetchErrors[label] = msg;
    console.warn(`[notion] ${label} query failed — falling back to sample data:`, msg);
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
const wPhone = (s?: string) => ({ phone_number: s || null });

const today = (): string => new Date().toISOString().slice(0, 10);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Human-readable business-ID seam (Leads/CRM Step 1). Establishes a reusable
 * `SL-<ENTITY>-0001` pattern for future display IDs — e.g. businessId("LEAD", 1)
 * → "SL-LEAD-0001". Not yet applied to any entity; the seam exists so later
 * phases can format Notion's auto-increment ("Lead ID"/"Client ID") consistently
 * without inventing a scheme per feature.
 */
export function businessId(entity: string, seq: number, pad = 4): string {
  return `SL-${entity.toUpperCase()}-${String(Math.max(0, Math.trunc(seq))).padStart(pad, "0")}`;
}

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
  contact?: string; // legacy alias for email (kept for backward compat)
  email?: string;
  phone?: string;
  source?: string;
  interest?: CoachingFocus[];
  estValue?: number;
  goal?: string;
  problem?: string;
  nextAction?: string;
  nextFollowUp?: string; // ISO
  consultDate?: string; // ISO
  closeProbability?: number; // 0-100
  assignedCoach?: string;
  status?: LeadStage;
}

export interface ClientInput {
  name: string;
  email?: string;
  phone?: string;
  status?: ClientStatus;
  coachingFocus?: CoachingFocus[];
  startDate?: string; // ISO
  renewalDate?: string; // ISO
  monthlyRate?: number;
  primaryGoal?: string;
  source?: string;
  plan?: string;
  billingStatus?: BillingStatus;
  riskLevel?: RiskLevel;
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
  clientId?: string;
  leadId?: string; // attach the note to a Lead instead of (or as well as) a Client
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
    email: input.email ?? input.contact ?? "",
    source: input.source ?? "",
    interest: input.interest ?? [],
    estValue: input.estValue ?? 0,
    nextFollowUp: input.nextFollowUp ?? "",
    nextAction: input.nextAction ?? "",
    notes: "",
    goal: input.goal ?? "",
    problem: input.problem ?? "",
    phone: input.phone || undefined,
    consultDate: input.consultDate || undefined,
    closeProbability: input.closeProbability,
    assignedCoach: input.assignedCoach || undefined,
  };
  if (!isLive) return sampleInsert(sample.leads, record);
  try {
    const props: Record<string, unknown> = {
      Name: wTitle(record.name),
      Stage: wSel(record.stage),
      Email: wEmail(record.email),
      Phone: wPhone(record.phone),
      Source: wSel(record.source || undefined),
      Interest: wMulti(record.interest),
      "Est. Value": wNum(record.estValue),
      Goal: wRich(record.goal),
      Problem: wRich(record.problem),
      "Next Action": wRich(record.nextAction),
      "Next Follow-up": wDate(record.nextFollowUp || undefined),
      "Consult Date": wDate(record.consultDate),
      "Close Probability": wNum(record.closeProbability),
      "Assigned Coach": wSel(record.assignedCoach),
    };
    return mapLead(await createPage(NOTION_DATA_SOURCES.leads, props));
  } catch (err) {
    console.warn("[notion] createLead failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.leads, record);
  }
}

/* ---- Manual client creation (coach-side "Add Client") ------------ */

async function createClient(input: ClientInput): Promise<Client> {
  announce();
  const record: Client = {
    id: localId("cl"),
    name: input.name,
    email: input.email ?? "",
    avatarInitials: initials(input.name),
    status: input.status ?? "Onboarding",
    coachingFocus: input.coachingFocus ?? [],
    startDate: input.startDate ?? today(),
    renewalDate: input.renewalDate ?? "",
    monthlyRate: input.monthlyRate ?? 0,
    primaryGoal: input.primaryGoal ?? "",
    riskLevel: input.riskLevel ?? "Green",
    source: input.source ?? "",
    currentPhase: "Foundation",
    compliance: 0,
    lastCheckIn: input.startDate ?? today(),
    lifetimeRevenue: 0,
    phone: input.phone || undefined,
    plan: input.plan || undefined,
    billingStatus: input.billingStatus,
  };
  if (!isLive) return sampleInsert(sample.clients, record);
  try {
    const props: Record<string, unknown> = {
      Name: wTitle(record.name),
      Email: wEmail(record.email),
      Phone: wPhone(record.phone),
      Status: wSel(record.status),
      "Coaching Focus": wMulti(record.coachingFocus),
      "Start Date": wDate(record.startDate || undefined),
      "Renewal Date": wDate(record.renewalDate || undefined),
      "Monthly Rate": wNum(record.monthlyRate),
      "Primary Goal": wRich(record.primaryGoal),
      Source: wSel(record.source || undefined),
      Plan: wSel(record.plan),
      "Billing Status": wSel(record.billingStatus),
      "Risk Level": wSel(record.riskLevel),
    };
    return mapClient(await createPage(NOTION_DATA_SOURCES.clients, props));
  } catch (err) {
    console.warn("[notion] createClient failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.clients, record);
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

/* ---- 3b. Lead → Client conversion orchestration ------------------ */

/**
 * Ecosystem setup hooks. Each is a safe seam a later phase fills in by calling
 * the existing create helpers (createProgram / createNutritionLog / updateClient
 * / createCheckIn / a future tasks store). Today they SKIP — the coach configures
 * these on the client page — so conversion never fabricates records.
 */
async function setupProgramHook(_client: Client, _lead: Lead): Promise<ConversionStep> {
  return { name: "Program", status: "skipped", detail: "No default program template — assign on the client page." };
}
async function setupNutritionHook(_client: Client, _lead: Lead): Promise<ConversionStep> {
  return { name: "Nutrition", status: "skipped", detail: "No default nutrition profile — set targets on the client page." };
}
async function setupBillingHook(_client: Client, _lead: Lead): Promise<ConversionStep> {
  return { name: "Billing", status: "skipped", detail: "No plan/rate on the lead — set billing on the client page." };
}
async function setupCheckInHook(_client: Client, _lead: Lead): Promise<ConversionStep> {
  return { name: "Check-in schedule", status: "skipped", detail: "No check-in cadence configured yet." };
}
async function setupWelcomeTasksHook(_client: Client, _lead: Lead): Promise<ConversionStep> {
  return { name: "Welcome tasks", status: "skipped", detail: "Tasks database not built yet." };
}

async function fetchLeadForConversion(id: string): Promise<Lead | undefined> {
  if (!isLive) return sample.leads.find((l) => l.id === id);
  try {
    return mapLead(await getClient().pages.retrieve({ page_id: id }));
  } catch (err) {
    console.warn("[notion] convertLead: lead lookup failed — using sample:", errMsg(err));
    return sample.leads.find((l) => l.id === id);
  }
}

async function fetchClientForConversion(id: string): Promise<Client | undefined> {
  if (!isLive) return sample.clients.find((c) => c.id === id);
  try {
    return mapClient(await getClient().pages.retrieve({ page_id: id }));
  } catch (err) {
    console.warn("[notion] convertLead: client lookup failed — using sample:", errMsg(err));
    return sample.clients.find((c) => c.id === id);
  }
}

/**
 * Convert a lead into the client ecosystem. Idempotent: if the lead already has
 * a Converted Client, it returns that client and creates nothing. Otherwise it
 * reuses createClientFromLead (unchanged), then runs the ecosystem hooks (which
 * skip today). Does not alter updateLeadStage / the Closed Won trigger.
 */
async function convertLead(leadId: string): Promise<ConversionResult> {
  announce();
  const lead = await fetchLeadForConversion(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  // Idempotency guard — already converted → return existing client, create nothing.
  if (lead.convertedClient) {
    return {
      success: true,
      clientId: lead.convertedClient,
      created: false,
      alreadyConverted: true,
      stepsCompleted: [],
      skippedSteps: [{ name: "All", reason: "Lead already converted to a client" }],
    };
  }

  // Reuse the existing client creation verbatim.
  const client = await createClientFromLead(lead);

  // Persist the link so a repeat call is a no-op. Live mode already set the dual
  // relation via createClientFromLead; sample mode records it locally.
  if (!isLive) {
    const sl = sample.leads.find((l) => l.id === leadId);
    if (sl) sl.convertedClient = client.id;
  }

  // Ecosystem hooks — placeholders that skip (no fabricated records).
  const steps = await Promise.all([
    setupProgramHook(client, lead),
    setupNutritionHook(client, lead),
    setupBillingHook(client, lead),
    setupCheckInHook(client, lead),
    setupWelcomeTasksHook(client, lead),
  ]);

  return {
    success: true,
    clientId: client.id,
    created: true,
    alreadyConverted: false,
    stepsCompleted: ["Client", ...steps.filter((s) => s.status === "completed").map((s) => s.name)],
    skippedSteps: steps
      .filter((s) => s.status === "skipped")
      .map((s) => ({ name: s.name, reason: s.detail ?? "not configured" })),
  };
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
    clientId: input.clientId ?? "",
    leadId: input.leadId,
    created: new Date().toISOString(),
    author: input.author ?? "Shane Lanteigne",
    type: input.type ?? "Coaching Note",
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
    if (input.leadId) props["Lead"] = wRel([input.leadId]);
    return mapCoachNote(await createPage(NOTION_DATA_SOURCES.coachNotes, props));
  } catch (err) {
    console.warn("[notion] createCoachNote failed — returning local record:", errMsg(err));
    return record;
  }
}

export interface CoachNotePatch {
  status?: CoachNote["status"];
  type?: CoachNote["type"];
  priority?: CoachNote["priority"];
  body?: string;
}

/**
 * Update a coach note in place (status change, edit, or archive). "Archive" is
 * a soft status change (Status = "Archived") so the coaching history is
 * preserved for future AI reads — nothing is destroyed.
 */
async function updateCoachNote(id: string, patch: CoachNotePatch): Promise<CoachNote> {
  announce();
  if (!isLive) {
    // No sample store for notes; echo an updated record so optimistic UI works.
    return {
      id,
      clientId: "",
      created: new Date().toISOString(),
      author: "Shane Lanteigne",
      type: patch.type ?? "Coaching Note",
      body: patch.body ?? "",
      status: patch.status ?? "New",
      priority: patch.priority,
    };
  }
  const props: Record<string, unknown> = {};
  if (patch.status !== undefined) props["Status"] = wSel(patch.status);
  if (patch.type !== undefined) props["Type"] = wSel(patch.type);
  if (patch.priority !== undefined) props["Priority"] = wSel(patch.priority);
  if (patch.body !== undefined) {
    const title = patch.body.length > 60 ? `${patch.body.slice(0, 57)}…` : patch.body;
    props["Body"] = wRich(patch.body);
    props["Note"] = wTitle(title || "Coach note");
  }
  const client = getClient();
  await client.pages.update({ page_id: id, properties: props } as Prop);
  return mapCoachNote(await client.pages.retrieve({ page_id: id } as Prop));
}

/* ---- 7. Log payment (Sales) -------------------------------------- */

export interface SaleInput {
  clientId: string;
  amount: number;
  date?: string;
  package?: string;
  paymentType?: PaymentType;
  paymentStatus?: PaymentStatus;
  title?: string;
}

async function createSale(input: SaleInput): Promise<Sale> {
  announce();
  const date = input.date ?? today();
  const record: Sale = {
    id: localId("sl"),
    title: input.title ?? `${input.package || "Payment"} — ${date}`,
    clientId: input.clientId,
    amount: input.amount,
    date,
    package: input.package ?? "",
    paymentType: input.paymentType ?? "Monthly",
    paymentStatus: input.paymentStatus ?? "Paid",
  };
  if (!isLive) return sampleInsert(sample.sales, record);
  try {
    const props: Record<string, unknown> = {
      Sale: wTitle(record.title),
      Amount: wNum(record.amount),
      Date: wDate(date),
      Package: wSel(record.package || undefined),
      "Payment Type": wSel(record.paymentType),
      "Payment Status": wSel(record.paymentStatus),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    return mapSale(await createPage(NOTION_DATA_SOURCES.sales, props));
  } catch (err) {
    console.warn("[notion] createSale failed — writing to sample memory:", errMsg(err));
    return sampleInsert(sample.sales, record);
  }
}

/* ---- 8. Update client billing / plan / status -------------------- */

export interface ClientPatch {
  billingStatus?: BillingStatus;
  plan?: string;
  monthlyRate?: number;
  status?: ClientStatus;
  nextPaymentDate?: string;
  cancelledDate?: string;
}

async function updateClient(id: string, patch: ClientPatch): Promise<Client> {
  announce();
  const sampleUpdate = (): Client => {
    const c = sample.clients.find((x) => x.id === id);
    if (!c) throw new Error(`Client ${id} not found in sample memory`);
    if (patch.billingStatus !== undefined) c.billingStatus = patch.billingStatus;
    if (patch.plan !== undefined) c.plan = patch.plan;
    if (patch.monthlyRate !== undefined) c.monthlyRate = patch.monthlyRate;
    if (patch.status !== undefined) c.status = patch.status;
    if (patch.nextPaymentDate !== undefined) c.nextPaymentDate = patch.nextPaymentDate;
    if (patch.cancelledDate !== undefined) c.cancelledDate = patch.cancelledDate;
    return c;
  };
  if (!isLive) return sampleUpdate();
  try {
    const props: Record<string, unknown> = {};
    if (patch.billingStatus !== undefined) props["Billing Status"] = wSel(patch.billingStatus);
    if (patch.plan !== undefined) props["Plan"] = wSel(patch.plan);
    if (patch.monthlyRate !== undefined) props["Monthly Rate"] = wNum(patch.monthlyRate);
    if (patch.status !== undefined) props["Status"] = wSel(patch.status);
    if (patch.nextPaymentDate !== undefined) props["Next Payment Date"] = wDate(patch.nextPaymentDate);
    if (patch.cancelledDate !== undefined) props["Cancelled Date"] = wDate(patch.cancelledDate);
    const client = getClient();
    await client.pages.update({ page_id: id, properties: props } as Prop);
    return mapClient(await client.pages.retrieve({ page_id: id } as Prop));
  } catch (err) {
    console.warn("[notion] updateClient failed — updating sample memory:", errMsg(err));
    return sampleUpdate();
  }
}

/* ---- 9. AI Recommendation ledger (Phase 0 — approval backbone) --- */

/**
 * Sample-mode store for recommendations. The other new databases fall back to
 * an empty array, but agents *write* recommendations, so in sample/local mode
 * (no NOTION_API_KEY) we keep them in memory so the approval inbox is testable
 * end to end without touching Notion.
 */
const _sampleRecs: Recommendation[] = [];

export interface RecommendationInput {
  title: string;
  kind: RecommendationKind;
  source: AgentSource;
  riskTier: RiskTier;
  summary: string;
  draft: string;
  clientId?: string;
  leadId?: string;
  dedupKey?: string;
  confidence?: number;
  status?: RecommendationStatus;
}

async function createRecommendation(input: RecommendationInput): Promise<Recommendation> {
  announce();
  const record: Recommendation = {
    id: localId("rec"),
    title: input.title,
    kind: input.kind,
    source: input.source,
    riskTier: input.riskTier,
    status: input.status ?? "pending",
    summary: input.summary,
    draft: input.draft,
    clientId: input.clientId,
    leadId: input.leadId,
    dedupKey: input.dedupKey,
    confidence: input.confidence,
    created: new Date().toISOString(),
  };
  if (!isLive) return sampleInsert(_sampleRecs, record);
  try {
    const props: Record<string, unknown> = {
      Name: wTitle(input.title || "Recommendation"),
      Kind: wSel(input.kind),
      Source: wSel(input.source),
      "Risk Tier": wSel(input.riskTier),
      Status: wSel(record.status),
      Summary: wRich(input.summary),
      Draft: wRich(input.draft),
      Confidence: wNum(input.confidence),
      "Dedup Key": wRich(input.dedupKey),
    };
    if (input.clientId) props["Client"] = wRel([input.clientId]);
    if (input.leadId) props["Lead"] = wRel([input.leadId]);
    return mapRecommendation(await createPage(NOTION_DATA_SOURCES.recommendations, props));
  } catch (err) {
    console.warn("[notion] createRecommendation failed — writing to sample memory:", errMsg(err));
    return sampleInsert(_sampleRecs, record);
  }
}

export interface RecommendationPatch {
  status?: RecommendationStatus;
  draft?: string;
  reviewedBy?: string;
  reviewed?: string;
  appliedResultId?: string;
}

async function updateRecommendation(id: string, patch: RecommendationPatch): Promise<Recommendation> {
  announce();
  const sampleUpdate = (): Recommendation => {
    const r = _sampleRecs.find((x) => x.id === id);
    if (!r) throw new Error(`Recommendation ${id} not found in sample memory`);
    if (patch.status !== undefined) r.status = patch.status;
    if (patch.draft !== undefined) r.draft = patch.draft;
    if (patch.reviewedBy !== undefined) r.reviewedBy = patch.reviewedBy;
    if (patch.reviewed !== undefined) r.reviewed = patch.reviewed;
    if (patch.appliedResultId !== undefined) r.appliedResultId = patch.appliedResultId;
    return r;
  };
  if (!isLive) return sampleUpdate();
  try {
    const props: Record<string, unknown> = {};
    if (patch.status !== undefined) props["Status"] = wSel(patch.status);
    if (patch.draft !== undefined) props["Draft"] = wRich(patch.draft);
    if (patch.reviewedBy !== undefined) props["Reviewed By"] = wRich(patch.reviewedBy);
    if (patch.reviewed !== undefined) props["Reviewed"] = wDate(patch.reviewed);
    if (patch.appliedResultId !== undefined) props["Applied Result Id"] = wRich(patch.appliedResultId);
    const client = getClient();
    await client.pages.update({ page_id: id, properties: props } as Prop);
    return mapRecommendation(await client.pages.retrieve({ page_id: id } as Prop));
  } catch (err) {
    console.warn("[notion] updateRecommendation failed — updating sample memory:", errMsg(err));
    return sampleUpdate();
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
  // AI Recommendations ledger — sample mode uses an in-memory store (agents write here).
  getRecommendations: (): Promise<Recommendation[]> =>
    fetchOrFallback("recommendations", NOTION_DATA_SOURCES.recommendations, mapRecommendation, _sampleRecs),

  // Writes
  createCheckIn,
  createRecommendation,
  updateRecommendation,
  createLead,
  createClient,
  updateLeadStage,
  convertLead,
  createProgram,
  createNutritionLog,
  createCoachNote,
  updateCoachNote,
  createSale,
  updateClient,
};
