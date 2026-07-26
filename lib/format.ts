/** Small formatting + derived-metric helpers used across the UI. */

import type { RiskLevel } from "./types";

export function currency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeDate(iso: string, today = "2026-07-26"): string {
  const then = new Date(iso + "T00:00:00").getTime();
  const now = new Date(today + "T00:00:00").getTime();
  const days = Math.round((now - then) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1) return `${days} days ago`;
  if (days === -1) return "Tomorrow";
  return `in ${Math.abs(days)} days`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

/** Tailwind classes for a risk pill. */
export function riskClasses(level: RiskLevel): string {
  switch (level) {
    case "Green":
      return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30";
    case "Yellow":
      return "bg-amber-500/15 text-amber-400 ring-amber-500/30";
    case "Red":
      return "bg-blood-500/15 text-blood-400 ring-blood-500/40";
  }
}

/** Color for a compliance / adherence value. */
export function complianceColor(value: number): string {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-blood-500";
}
