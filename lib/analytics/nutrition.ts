/**
 * Nutrition analytics — portfolio-level compliance from the Nutrition log.
 * Pure functions; returns null when there are no logs (honest empty state).
 */

import type { OwnerData } from "./context";

/** Average nutrition compliance across all logs; null when there are none. */
export function avgNutritionCompliance(data: OwnerData): number | null {
  if (!data.nutrition.length) return null;
  const total = data.nutrition.reduce((n, x) => n + (x.compliance ?? 0), 0);
  return Math.round(total / data.nutrition.length);
}

/** Distinct clients with at least one nutrition log. */
export function clientsWithNutrition(data: OwnerData): Set<string> {
  return new Set(data.nutrition.map((n) => n.clientId));
}

/** Count of distinct clients with a nutrition plan/log on record. */
export function nutritionPlanCount(data: OwnerData): number {
  return clientsWithNutrition(data).size;
}
