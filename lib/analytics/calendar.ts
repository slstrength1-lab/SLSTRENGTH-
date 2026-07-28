/**
 * Calendar analytics — a lean next-N-days agenda from live dates: check-ins due,
 * consultations, payments, renewals/expiring plans, program start/end, and
 * client birthdays (recurring annually). Pure; sorted ascending.
 */

import type { CalendarEvent, CalendarEventType } from "../types";
import type { OwnerData, AnalyticsContext } from "./context";
import { withinNextDays } from "./dates";

export function calendar(data: OwnerData, ctx: AnalyticsContext): CalendarEvent[] {
  const { active, nowISO, config, nameOf } = ctx;
  const events: CalendarEvent[] = [];
  const add = (date: string, type: CalendarEventType, label: string, detail?: string) => {
    if (date && withinNextDays(date, nowISO, config.upcomingDays)) events.push({ date, type, label, detail });
  };

  for (const c of active) {
    if (c.lastCheckIn) {
      const due = new Date(c.lastCheckIn + "T00:00:00");
      due.setDate(due.getDate() + 7);
      add(due.toISOString().slice(0, 10), "Check-in", c.name, "Weekly check-in due");
    }
    if (c.nextPaymentDate) add(c.nextPaymentDate, "Payment", c.name, `${c.monthlyRate}`);
    if (c.renewalDate) add(c.renewalDate, "Renewal", c.name);
    if (c.birthday && c.birthday.length >= 10) {
      const mmdd = c.birthday.slice(5, 10);
      const year = Number(nowISO.slice(0, 4));
      for (const y of [year, year + 1]) {
        const occ = `${y}-${mmdd}`;
        if (withinNextDays(occ, nowISO, config.upcomingDays)) {
          add(occ, "Birthday", c.name, "🎂 Birthday");
          break;
        }
      }
    }
  }

  for (const l of data.leads) {
    if (l.stage === "Call Scheduled" && l.nextFollowUp) add(l.nextFollowUp, "Consultation", l.name, l.nextAction);
  }

  for (const p of data.programs) {
    const c = nameOf.get(p.clientId);
    if (p.startDate) add(p.startDate, "Program Start", c?.name ?? p.name, p.name);
    if (p.endDate) add(p.endDate, "Program End", c?.name ?? p.name, p.name);
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}
