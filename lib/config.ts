/**
 * Owner-set business targets and dashboard thresholds.
 *
 * These are values the coach owns (a revenue goal, a client capacity, how many
 * days counts as "overdue") that have no home in any Notion database yet.
 * Keeping them here — driven by env vars with sensible defaults — means the
 * Owner Dashboard can show goal/capacity metrics without a schema change, and
 * they can be promoted to a Notion "Business Config" row later without touching
 * the UI. Components never read process.env directly; they receive `OwnerConfig`.
 */

export interface OwnerConfig {
  /** Monthly revenue target (USD) — powers Revenue Goal / Remaining / vs-Goal. */
  revenueGoal: number;
  /** Roster ceiling — powers Client Capacity + capacity utilisation. */
  clientCapacity: number;
  /** Days since last check-in before a client is flagged overdue. */
  checkInOverdueDays: number;
  /** Look-ahead window for "ending soon" programs. */
  endingSoonDays: number;
  /** Look-ahead window for upcoming renewals / payments / calendar. */
  upcomingDays: number;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resolve the owner config from env (with defaults). Server-only. */
export function getOwnerConfig(): OwnerConfig {
  return {
    revenueGoal: numEnv("SL_REVENUE_GOAL", 15000),
    clientCapacity: numEnv("SL_CLIENT_CAPACITY", 30),
    checkInOverdueDays: numEnv("SL_CHECKIN_OVERDUE_DAYS", 10),
    endingSoonDays: numEnv("SL_ENDING_SOON_DAYS", 14),
    upcomingDays: numEnv("SL_UPCOMING_DAYS", 14),
  };
}
