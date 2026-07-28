/**
 * Date helpers shared across the analytics layer.
 *
 * Pure and dependency-free so every analytics module — and any future consumer
 * (AI advisor, HPOS) — computes dates the same way. No React, no fetching.
 */

/** "YYYY-MM" bucket for an ISO date/datetime string. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Whole calendar months from `fromISO` to `toISO` (0 if invalid/empty). */
export function monthsBetween(fromISO: string, toISO: string): number {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO + (fromISO.length === 10 ? "T00:00:00" : ""));
  const b = new Date(toISO + (toISO.length === 10 ? "T00:00:00" : ""));
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Whole days from `fromISO` to `toISO` (negative if `toISO` is in the past). */
export function dayDiff(fromISO: string, toISO: string): number | null {
  if (!fromISO || !toISO) return null;
  const a = new Date(fromISO + (fromISO.length === 10 ? "T00:00:00" : "")).getTime();
  const b = new Date(toISO + (toISO.length === 10 ? "T00:00:00" : "")).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** True when `dateISO` falls within the next `days` days (inclusive of today). */
export function withinNextDays(dateISO: string, nowISO: string, days: number): boolean {
  const d = dayDiff(nowISO, dateISO);
  return d !== null && d >= 0 && d <= days;
}

/** The "YYYY-MM" key `n` months before `nowISO`. */
export function monthKeyOffset(nowISO: string, n: number): string {
  const d = new Date(nowISO + "T00:00:00");
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

/** Short month label (e.g. "Mar") `n` months before `nowISO`. */
export function monthLabelOffset(nowISO: string, n: number): string {
  const d = new Date(nowISO + "T00:00:00");
  d.setMonth(d.getMonth() - n);
  return d.toLocaleDateString("en-US", { month: "short" });
}
