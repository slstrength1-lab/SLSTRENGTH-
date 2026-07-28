/**
 * Training analytics — portfolio-level workout completion. Per-client training
 * trends (volume / RPE) plug in here later without touching consumers.
 * Pure functions; returns null when there's no data (honest empty state).
 */

import type { OwnerData } from "./context";

/** Portfolio workout completion % across all logged Workout rows; null if none. */
export function avgWorkoutCompletion(data: OwnerData): number | null {
  if (!data.workouts.length) return null;
  const done = data.workouts.filter((w) => w.completed).length;
  return Math.round((done / data.workouts.length) * 100);
}

/** Distinct clients that have at least one logged workout row. */
export function clientsWithWorkouts(data: OwnerData): Set<string> {
  return new Set(data.workouts.map((w) => w.clientId));
}
