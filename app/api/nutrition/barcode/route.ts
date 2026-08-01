import { NextResponse } from "next/server";
import { getNutritionService } from "@/lib/nutrition";
import { statusForError } from "@/lib/nutrition/http-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

/** GET /api/nutrition/barcode?code=737628064502 — barcode/UPC lookup. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  try {
    const food = await getNutritionService().getByBarcode(code);
    if (!food) return NextResponse.json({ ok: true, food: null }, { status: 404 });
    return NextResponse.json({ ok: true, food });
  } catch (e) {
    const { status, error, code: c } = statusForError(e);
    return NextResponse.json({ ok: false, error, code: c }, { status });
  }
}
