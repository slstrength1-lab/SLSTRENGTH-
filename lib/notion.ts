/**
 * Notion adapter (stub).
 *
 * The prototype currently returns the in-memory sample data from `data.ts`.
 * When you are ready to connect the live Notion backend, implement the
 * functions below against @notionhq/client and map each database's data
 * source to the model shapes in `types.ts`. The UI and API routes call these
 * functions only — nothing else needs to change.
 *
 * Data source IDs (from the SL Strength OS Notion workspace):
 *   Clients          002ab021-86fe-43ed-b0c5-6de2ae845d48
 *   Leads            a7d125f8-b72a-4b17-8f54-5735e4fce805
 *   Sales            7f1cdeda-694e-4104-b4fe-8a49de234832
 *   Check-ins        54ba94b6-2204-48ef-824f-ad669a1f3660
 *   Programs         aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481
 *   Content          7b9428d8-9f4f-48c8-95d6-9a95bef9fc1f
 *   Business Metrics b456da35-4b5d-4870-a802-5c699d350855
 */

import {
  clients,
  leads,
  sales,
  checkIns,
  programs,
  content,
  metrics,
} from "./data";
import type {
  Client,
  Lead,
  Sale,
  CheckIn,
  Program,
  ContentItem,
  Metric,
} from "./types";

export const NOTION_DATA_SOURCES = {
  clients: "002ab021-86fe-43ed-b0c5-6de2ae845d48",
  leads: "a7d125f8-b72a-4b17-8f54-5735e4fce805",
  sales: "7f1cdeda-694e-4104-b4fe-8a49de234832",
  checkins: "54ba94b6-2204-48ef-824f-ad669a1f3660",
  programs: "aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481",
  content: "7b9428d8-9f4f-48c8-95d6-9a95bef9fc1f",
  metrics: "b456da35-4b5d-4870-a802-5c699d350855",
} as const;

/** True once NOTION_API_KEY is configured. Prototype runs in "sample" mode. */
export const isLive = Boolean(process.env.NOTION_API_KEY);

/**
 * Simulates async I/O so swapping in the real Notion client later is a
 * drop-in replacement (these become `notion.dataSources.query(...)` calls).
 */
async function resolve<T>(rows: T[]): Promise<T[]> {
  return Promise.resolve(rows);
}

export const notion = {
  getClients: (): Promise<Client[]> => resolve(clients),
  getLeads: (): Promise<Lead[]> => resolve(leads),
  getSales: (): Promise<Sale[]> => resolve(sales),
  getCheckIns: (): Promise<CheckIn[]> => resolve(checkIns),
  getPrograms: (): Promise<Program[]> => resolve(programs),
  getContent: (): Promise<ContentItem[]> => resolve(content),
  getMetrics: (): Promise<Metric[]> => resolve(metrics),
};
