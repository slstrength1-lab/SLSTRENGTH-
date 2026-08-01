import { NextResponse } from "next/server";
import { getNutritionService, analyzeRecipe, type Ingredient } from "@/lib/nutrition";
import { statusForError } from "@/lib/nutrition/http-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/nutrition/recipe
 * body: { ingredients: [{ query|foodId|barcode, amount, unit?, servingLabel? }], servings?: number }
 * → whole-recipe + per-serving nutrition, computed by aggregating ingredient lookups.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ingredients?: Ingredient[]; servings?: number };
    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json({ ok: false, error: "ingredients[] required", code: "validation" }, { status: 400 });
    }
    const analysis = await analyzeRecipe(getNutritionService(), { ingredients: body.ingredients, servings: body.servings });
    return NextResponse.json({ ok: true, analysis });
  } catch (e) {
    const { status, error, code } = statusForError(e);
    return NextResponse.json({ ok: false, error, code }, { status });
  }
}
