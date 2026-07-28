/**
 * Operations analytics — delivery-machine throughput counts and a merged,
 * time-sorted recent-activity feed. Pure.
 */

import type { ActivityItem } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { monthKey, withinNextDays } from "./dates";
import { nutritionPlanCount } from "./nutrition";

export interface OpsCounts {
  programsActive: number;
  programsEnding: number;
  pendingNotes: number;
  openAiRecs: number;
  nutritionPlans: number;
  completedCheckIns: number;
}

export function opsCounts(data: OwnerData, ctx: AnalyticsContext): OpsCounts {
  return {
    programsActive: data.programs.filter((p) => p.status === "Active").length,
    programsEnding: data.programs.filter(
      (p) => p.status === "Active" && p.endDate && withinNextDays(p.endDate, ctx.nowISO, ctx.config.endingSoonDays),
    ).length,
    pendingNotes: data.coachNotes.filter((n) => n.status === "New" || n.status === "In Progress").length,
    openAiRecs: data.coachNotes.filter((n) => n.type === "AI Recommendation" && n.status === "New").length,
    nutritionPlans: nutritionPlanCount(data),
    completedCheckIns: data.checkIns.filter((c) => c.status === "Reviewed" && monthKey(c.date) === ctx.thisKey).length,
  };
}

/** Merged newest-first feed of payments, check-ins, notes, and new clients. */
export function activityFeed(data: OwnerData, ctx: AnalyticsContext, limit = 8): ActivityItem[] {
  const { nameOf } = ctx;
  return [
    ...ctx.paid.map((s): ActivityItem => ({
      id: `pay_${s.id}`,
      type: "payment",
      date: s.date,
      title: `Payment · ${s.amount}`,
      detail: nameOf.get(s.clientId)?.name ?? s.package ?? "",
      clientId: s.clientId,
    })),
    ...data.checkIns.map((c): ActivityItem => ({
      id: `ci_${c.id}`,
      type: "checkin",
      date: c.date,
      title: "Check-in",
      detail: `${nameOf.get(c.clientId)?.name ?? "Client"} · ${c.compliance}% compliance`,
      clientId: c.clientId,
    })),
    ...data.coachNotes.map((n): ActivityItem => ({
      id: `note_${n.id}`,
      type: "note",
      date: n.created,
      title: n.type,
      detail: `${nameOf.get(n.clientId)?.name ?? "Client"} · ${n.body.slice(0, 60)}`,
      clientId: n.clientId,
    })),
    ...data.clients
      .filter((c) => c.startDate)
      .map((c): ActivityItem => ({
        id: `client_${c.id}`,
        type: "client",
        date: c.startDate,
        title: "New client",
        detail: c.name,
        clientId: c.id,
      })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}
