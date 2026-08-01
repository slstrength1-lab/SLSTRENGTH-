/**
 * AI Nutrition Planner — the seed of the future Nutrition Agent.
 *
 * Flow: stats+goal → deterministic macro targets (planning.ts) → Claude designs
 * a day of meals to hit them → every food is RE-PRICED against the real nutrition
 * database (USDA/OFF/FatSecret) so the macros are true, not model guesses → we
 * report actual vs target. The AI designs; the database decides the numbers.
 *
 * Gated on ANTHROPIC_API_KEY (isAgentLive). Grounding works on whatever nutrition
 * providers are configured (Open Food Facts needs no key).
 */
import { generate, isAgentLive } from "./shared/llm";
import { getNutritionService } from "@/lib/nutrition";
import { resolveIngredient } from "@/lib/nutrition/recipe";
import { roundProfile, addProfiles } from "@/lib/nutrition/normalize";
import { calcTargets, comparePlan, type ClientStats, type MacroTargets } from "@/lib/nutrition/planning";
import type { NutrientProfile } from "@/lib/nutrition/types";

export interface PlanRequest {
  stats?: ClientStats; // provide stats OR targets
  targets?: MacroTargets;
  mealsPerDay?: number; // default 4
  preferences?: string; // "high protein, likes chicken & rice, quick meals"
  avoid?: string; // "dairy, shellfish"
  clientName?: string;
}

interface PlanFood {
  name: string;
  query: string;
  amount: number;
  unit: string;
  grams: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  source?: string;
  unresolved?: boolean;
}
interface PlanMeal {
  name: string;
  foods: PlanFood[];
  totals: NutrientProfile;
}
export interface MealPlan {
  ok: true;
  targets: MacroTargets;
  meals: PlanMeal[];
  dayTotals: NutrientProfile;
  comparison: ReturnType<typeof comparePlan>;
  notes?: string;
  unresolved: string[];
}
export type PlanResult = MealPlan | { ok: false; error: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          foods: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                query: { type: "string" }, // simple search term, e.g. "chicken breast, cooked"
                amount: { type: "number" },
                unit: { type: "string" }, // "g" preferred; else "oz","cup","serving"
              },
              required: ["name", "query", "amount", "unit"],
            },
          },
        },
        required: ["name", "foods"],
      },
    },
    notes: { type: "string" },
  },
  required: ["meals"],
};

interface RawPlan {
  meals: { name: string; foods: { name: string; query: string; amount: number; unit: string }[] }[];
  notes?: string;
}

const SYSTEM = `You are a sports-nutrition coach building a single day's meal plan for a strength/physique client.
Design meals that hit the daily targets you're given (calories, protein, carbs, fat). Rules:
- Use whole, common foods with realistic portions. Prefer grams for amount+unit; you may use "oz", "cup", or "serving".
- "query" must be a simple food-search term (e.g. "chicken breast cooked", "white rice cooked", "olive oil") — no brand names unless essential.
- Respect the client's preferences and avoid-list. Hit protein first; it's the priority for a strength client.
- Do NOT report macro numbers — a nutrition database computes the real macros from your foods and portions. Just choose foods and amounts.
- Keep it practical: the sum of your portions should land close to the targets.`;

export async function generateMealPlan(req: PlanRequest): Promise<PlanResult> {
  if (!isAgentLive) return { ok: false, error: "AI layer not configured — set ANTHROPIC_API_KEY." };
  const targets = req.targets ?? (req.stats ? calcTargets(req.stats) : null);
  if (!targets) return { ok: false, error: "Provide either `stats` or `targets`." };
  const mealsPerDay = req.mealsPerDay ?? 4;

  const user = [
    `Daily targets — calories: ${targets.calories} kcal, protein: ${targets.protein} g, carbs: ${targets.carbs} g, fat: ${targets.fat} g, fiber ~${targets.fiber} g.`,
    `Meals: ${mealsPerDay} per day.`,
    req.preferences ? `Preferences: ${req.preferences}.` : "",
    req.avoid ? `Avoid: ${req.avoid}.` : "",
    req.clientName ? `Client: ${req.clientName}.` : "",
    `Design ${mealsPerDay} meals of whole foods with portions that add up close to the targets.`,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generate<RawPlan>({ system: SYSTEM, user, schema: SCHEMA, effort: "medium", maxTokens: 4000 });
  if (!raw?.meals?.length) return { ok: false, error: "The planner returned no meals — try again or adjust preferences." };

  const service = getNutritionService();
  const unresolved: string[] = [];
  const meals: PlanMeal[] = [];

  for (const m of raw.meals) {
    const foods: PlanFood[] = [];
    for (const f of m.foods || []) {
      const resolved = await resolveIngredient(service, { query: f.query, amount: f.amount, unit: f.unit });
      if (!resolved.food) unresolved.push(f.query);
      const macros = roundProfile(resolved.nutrients);
      foods.push({
        name: f.name,
        query: f.query,
        amount: f.amount,
        unit: f.unit,
        grams: Math.round(resolved.grams),
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        source: resolved.food?.source,
        unresolved: !resolved.food,
      });
    }
    const totals = roundProfile(addProfiles(...foods.map((f) => ({ calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }))));
    meals.push({ name: m.name, foods, totals });
  }

  const dayTotals = roundProfile(addProfiles(...meals.map((m) => m.totals)));
  return {
    ok: true,
    targets,
    meals,
    dayTotals,
    comparison: comparePlan(targets, dayTotals),
    notes: raw.notes,
    unresolved,
  };
}
