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
/* Public adapter (unchanged surface — same shapes, now live-capable)  */
/* ------------------------------------------------------------------ */

export const notion = {
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
};
