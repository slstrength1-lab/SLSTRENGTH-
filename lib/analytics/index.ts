/**
 * Analytics layer — the single source of business logic for the SL Strength OS.
 *
 * Pure, framework-agnostic functions consumed by the Owner Dashboard, the Client
 * Command Center, and (later) an AI advisor. The store fetches data; these
 * modules compute. HPOS can reuse this architecture with its own data + config
 * while remaining a separate implementation.
 *
 * Data flow:  UI → analytics (pure) ← data from store → notion → Notion
 */

export * from "./context";
export * as business from "./business";
export * as clients from "./clients";
export * as revenue from "./revenue";
export * as training from "./training";
export * as nutrition from "./nutrition";
export * as content from "./content";
export * as operations from "./operations";
export { priorities } from "./risk";
export { calendar } from "./calendar";
export { summarizeOwner } from "./owner";
export { summarizeBusiness } from "./revenue";
