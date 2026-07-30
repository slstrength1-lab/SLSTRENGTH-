/**
 * Recommendation analytics — pure functions over the AI Recommendations ledger.
 * The store fetches; these compute the counts and groupings the approval inbox
 * and the owner dashboard render. No LLM, no I/O.
 */
import type {
  Recommendation,
  RecommendationStatus,
  RecommendationKind,
  RiskTier,
} from "../types";

export const RISK_ORDER: RiskTier[] = ["manual", "review", "safe"];
export const RISK_LABELS: Record<RiskTier, string> = {
  safe: "Safe",
  review: "Needs review",
  manual: "Manual only",
};

/** Open items still awaiting a human decision. */
export const isPending = (r: Recommendation): boolean => r.status === "pending";

export function pending(recs: Recommendation[]): Recommendation[] {
  return recs.filter(isPending);
}

/** Pending items that specifically require the coach's judgement (not safe/auto). */
export function needsReview(recs: Recommendation[]): Recommendation[] {
  return recs.filter((r) => r.status === "pending" && r.riskTier !== "safe");
}

export function byStatus(recs: Recommendation[]): Record<RecommendationStatus, number> {
  const out: Record<RecommendationStatus, number> = {
    pending: 0,
    approved: 0,
    applied: 0,
    rejected: 0,
    dismissed: 0,
  };
  for (const r of recs) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

export function byRiskTier(recs: Recommendation[]): Record<RiskTier, number> {
  const out: Record<RiskTier, number> = { safe: 0, review: 0, manual: 0 };
  for (const r of recs) out[r.riskTier] = (out[r.riskTier] ?? 0) + 1;
  return out;
}

export function byKind(recs: Recommendation[]): Partial<Record<RecommendationKind, number>> {
  const out: Partial<Record<RecommendationKind, number>> = {};
  for (const r of recs) out[r.kind] = (out[r.kind] ?? 0) + 1;
  return out;
}

/** Sort for the inbox: pending first, then by risk (manual→safe), then newest. */
export function inboxOrder(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => {
    if (isPending(a) !== isPending(b)) return isPending(a) ? -1 : 1;
    const risk = RISK_ORDER.indexOf(a.riskTier) - RISK_ORDER.indexOf(b.riskTier);
    if (risk !== 0) return risk;
    return a.created < b.created ? 1 : -1;
  });
}

export interface RecommendationSummary {
  total: number;
  pending: number;
  needsReview: number;
  approved: number;
  applied: number;
  rejected: number;
  byRisk: Record<RiskTier, number>;
  byKind: Partial<Record<RecommendationKind, number>>;
}

export function summarizeRecommendations(recs: Recommendation[]): RecommendationSummary {
  const status = byStatus(recs);
  return {
    total: recs.length,
    pending: status.pending,
    needsReview: needsReview(recs).length,
    approved: status.approved,
    applied: status.applied,
    rejected: status.rejected,
    byRisk: byRiskTier(recs),
    byKind: byKind(recs),
  };
}
