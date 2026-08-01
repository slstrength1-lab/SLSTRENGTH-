import { NextResponse } from "next/server";
import { generateMealPlan, type PlanRequest } from "@/lib/agents/nutrition-planner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120; // AI + grounding lookups

/**
 * POST /api/nutrition/plan — AI meal plan grounded in the real nutrition DB.
 * body: { stats? | targets?, mealsPerDay?, preferences?, avoid?, clientName? }
 * Requires ANTHROPIC_API_KEY. (Use /api/nutrition/targets for numbers-only.)
 */
export async function POST(request: Request) {
  let body: PlanRequest = {};
  try {
    body = (await request.json()) as PlanRequest;
  } catch {
    /* empty body */
  }
  const result = await generateMealPlan(body);
  return NextResponse.json(result, { status: result.ok ? 200 : result.error.includes("ANTHROPIC") ? 400 : 422 });
}
