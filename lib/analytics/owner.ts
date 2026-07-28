/**
 * Owner-dashboard composition — assembles the domain analytics modules into a
 * single OwnerSummary. This is the one place the dashboard depends on; the
 * dashboard consumes analytics, never the store or Notion directly.
 *
 * Every field traces to a pure domain function (business/clients/revenue/
 * training/nutrition/risk/calendar/operations) so the same numbers can feed a
 * future AI advisor — and HPOS can reuse this architecture with its own data.
 */

import type { OwnerSummary } from "../types";
import type { OwnerConfig } from "../config";
import { getOwnerConfig } from "../config";
import type { OwnerData } from "./context";
import { buildContext } from "./context";
import * as business from "./business";
import * as clients from "./clients";
import * as revenue from "./revenue";
import * as training from "./training";
import * as nutrition from "./nutrition";
import * as ops from "./operations";
import { priorities } from "./risk";
import { calendar } from "./calendar";

export function summarizeOwner(
  data: OwnerData,
  config: OwnerConfig = getOwnerConfig(),
  nowISO: string = new Date().toISOString().slice(0, 10),
): OwnerSummary {
  const ctx = buildContext(data, config, nowISO);

  const mrr = business.mrr(data, ctx);
  const goal = business.revenueGoalProgress(data, ctx);
  const cap = clients.capacity(data, ctx);
  const cnt = clients.counts(data, ctx);
  const opsCounts = ops.opsCounts(data, ctx);

  return {
    /* Revenue */
    mrr,
    arr: mrr * 12,
    monthlyRevenue: business.monthlyRevenue(data, ctx),
    revenueLastMonth: business.lastMonthRevenue(data, ctx),
    revenueGrowth: business.revenueGrowth(data, ctx),
    revenueGoal: goal.goal,
    revenueRemaining: goal.remaining,
    goalProgress: goal.progress,
    revenueTrend: business.revenueTrend(data, ctx),
    clientLifetimeValue: revenue.clientLifetimeValue(data),
    avgRevenuePerClient: revenue.avgRevenuePerClient(data),
    /* Clients */
    activeClients: cnt.active,
    newClientsThisMonth: clients.newThisMonth(data, ctx),
    clientCapacity: cap.capacity,
    capacityFill: cap.fill,
    capacityRemaining: cap.remaining,
    pausedClients: cnt.paused,
    pastDueClients: cnt.pastDue,
    cancelledClients: cnt.cancelled,
    avgClientValue: cnt.active > 0 ? Math.round(mrr / cnt.active) : 0,
    avgClientLifetimeMonths: clients.avgLifetimeMonths(data, ctx),
    churnRate: clients.churnRate(data, ctx),
    clientGrowthTrend: clients.growthTrend(data, ctx),
    lostThisMonth: clients.lostThisMonth(data, ctx),
    conversionRate: revenue.conversionRate(data),
    newLeads: revenue.openLeadCount(data),
    /* Health */
    portfolioCompliance: clients.avgCompliance(data, ctx),
    workoutCompletion: training.avgWorkoutCompletion(data),
    nutritionCompliance: nutrition.avgNutritionCompliance(data),
    topClients: clients.topClients(data, ctx),
    recentPayments: revenue.recentPayments(data, ctx),
    upcomingPayments: revenue.upcomingPayments(data, ctx),
    /* Operations */
    programsActive: opsCounts.programsActive,
    programsEnding: opsCounts.programsEnding,
    pendingNotes: opsCounts.pendingNotes,
    openAiRecs: opsCounts.openAiRecs,
    nutritionPlans: opsCounts.nutritionPlans,
    completedCheckIns: opsCounts.completedCheckIns,
    activity: ops.activityFeed(data, ctx),
    /* Priorities + calendar */
    priorities: priorities(data, ctx),
    calendar: calendar(data, ctx),
  };
}
