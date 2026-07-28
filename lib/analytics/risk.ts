/**
 * Risk & priorities analytics — the cross-client "what needs attention today"
 * engine plus at-risk ranking. Pure; only non-empty groups are returned so the
 * UI renders exactly what matters. A future AI advisor consumes the same output.
 */

import type { Client, PriorityGroup, PriorityItem } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { dayDiff, withinNextDays } from "./dates";
import { clientsWithWorkouts } from "./training";
import { clientsWithNutrition } from "./nutrition";

function toItem(c: Client, detail: string): PriorityItem {
  return { clientId: c.id, name: c.name, initials: c.avatarInitials, detail };
}

/**
 * Today's Priorities — grouped, cross-client, live. Groups (in order):
 * overdue check-ins, past-due payments, programs ending, no active program,
 * upcoming renewals/expiring plans, declining compliance, nutrition reviews,
 * no workouts, upcoming consultations, new leads, new payments today.
 */
export function priorities(data: OwnerData, ctx: AnalyticsContext): PriorityGroup[] {
  const { active, nowISO, config, nameOf } = ctx;
  const out: PriorityGroup[] = [];
  const push = (key: string, label: string, tone: PriorityGroup["tone"], items: PriorityItem[]) => {
    if (items.length) out.push({ key, label, tone, items });
  };

  push(
    "checkin-overdue",
    "Check-in overdue",
    "red",
    active
      .filter((c) => {
        const d = c.lastCheckIn ? dayDiff(c.lastCheckIn, nowISO) : null;
        return d !== null && d > config.checkInOverdueDays;
      })
      .map((c) => toItem(c, `${dayDiff(c.lastCheckIn, nowISO)}d since check-in`)),
  );

  push(
    "past-due",
    "Past-due payments",
    "red",
    data.clients.filter((c) => c.billingStatus === "Past Due").map((c) => toItem(c, "Payment past due")),
  );

  push(
    "programs-ending",
    "Programs ending soon",
    "amber",
    data.programs
      .filter((p) => p.status === "Active" && p.endDate && withinNextDays(p.endDate, nowISO, config.endingSoonDays))
      .map((p) => {
        const c = nameOf.get(p.clientId);
        return c ? toItem(c, `${p.name} ends in ${dayDiff(nowISO, p.endDate)}d`) : null;
      })
      .filter((x): x is PriorityItem => x !== null),
  );

  const withActiveProgram = new Set(data.programs.filter((p) => p.status === "Active").map((p) => p.clientId));
  push(
    "no-program",
    "No active program",
    "amber",
    active.filter((c) => !withActiveProgram.has(c.id)).map((c) => toItem(c, "No program assigned")),
  );

  push(
    "renewals",
    "Expiring plans / renewals",
    "sky",
    active
      .filter((c) => c.renewalDate && withinNextDays(c.renewalDate, nowISO, config.upcomingDays))
      .map((c) => toItem(c, `Renews in ${dayDiff(nowISO, c.renewalDate)}d`)),
  );

  push(
    "declining",
    "Declining compliance",
    "amber",
    active
      .map((c) => {
        const cis = data.checkIns.filter((x) => x.clientId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
        return cis.length >= 2 && cis[0].compliance < cis[1].compliance
          ? toItem(c, `${cis[1].compliance}% → ${cis[0].compliance}%`)
          : null;
      })
      .filter((x): x is PriorityItem => x !== null),
  );

  const withNutrition = clientsWithNutrition(data);
  push(
    "nutrition-review",
    "Nutrition reviews",
    "sky",
    active.filter((c) => !withNutrition.has(c.id)).map((c) => toItem(c, "No nutrition log")),
  );

  const withWorkouts = clientsWithWorkouts(data);
  push(
    "no-workouts",
    "No workouts logged",
    "sky",
    active.filter((c) => !withWorkouts.has(c.id)).map((c) => toItem(c, "No workout data")),
  );

  // Upcoming consultations — leads with a scheduled call in the window.
  push(
    "consultations",
    "Upcoming consultations",
    "emerald",
    data.leads
      .filter((l) => l.stage === "Call Scheduled" && l.nextFollowUp && withinNextDays(l.nextFollowUp, nowISO, config.upcomingDays))
      .map((l) => ({ clientId: `lead_${l.id}`, name: l.name, initials: initials(l.name), detail: l.nextAction || "Consultation" })),
  );

  // New leads — open leads needing first action.
  push(
    "new-leads",
    "New leads",
    "emerald",
    data.leads
      .filter((l) => l.stage === "New" || l.stage === "Contacted")
      .map((l) => ({ clientId: `lead_${l.id}`, name: l.name, initials: initials(l.name), detail: `${l.stage} · ${l.source}` })),
  );

  push(
    "new-payments",
    "New payments today",
    "emerald",
    ctx.paid
      .filter((s) => s.date === nowISO)
      .map((s) => {
        const c = nameOf.get(s.clientId);
        return c ? toItem(c, `Paid ${s.amount}`) : null;
      })
      .filter((x): x is PriorityItem => x !== null),
  );

  return out;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
