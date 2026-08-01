import { NextResponse } from "next/server";
import { getNutritionService } from "@/lib/nutrition";
import { statusForError } from "@/lib/nutrition/http-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

/** GET /api/nutrition/search?q=chicken&limit=15 — food search with fallback. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const limit = Number(url.searchParams.get("limit")) || 15;
  try {
    const foods = await getNutritionService().searchFoods(q, { limit });
    return NextResponse.json({ ok: true, count: foods.length, foods });
  } catch (e) {
    const { status, error, code } = statusForError(e);
    return NextResponse.json({ ok: false, error, code }, { status });
  }
}
