import { NextResponse } from "next/server";
import { getNutritionService, nutritionConfigStatus } from "@/lib/nutrition";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/nutrition/status — which providers are live + config warnings. */
export async function GET() {
  const status = nutritionConfigStatus();
  return NextResponse.json({ ok: true, ...status, providers: getNutritionService().listProviders(), config: status.providers });
}
