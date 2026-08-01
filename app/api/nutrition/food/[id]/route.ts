import { NextResponse } from "next/server";
import { getNutritionService } from "@/lib/nutrition";
import { statusForError } from "@/lib/nutrition/http-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/nutrition/food/usda:171077 — full nutrition for a canonical id. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const food = await getNutritionService().getFood(decodeURIComponent(params.id));
    if (!food) return NextResponse.json({ ok: true, food: null }, { status: 404 });
    return NextResponse.json({ ok: true, food });
  } catch (e) {
    const { status, error, code } = statusForError(e);
    return NextResponse.json({ ok: false, error, code }, { status });
  }
}
