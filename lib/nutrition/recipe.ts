/**
 * Recipe / meal / day / week nutrition — computed by aggregating ingredient
 * lookups through the same providers (no paid recipe API). Pure once foods are
 * resolved; the resolve step uses the service.
 */
import type { FoodItem, Ingredient, NutrientProfile, NutrientTotals, RecipeAnalysis, ResolvedIngredient } from "./types";
import { addProfiles, multiplyProfile, scaleProfile } from "./normalize";
import { isMass, isVolume, toGrams } from "./units";
import type { NutritionService } from "./service";
import type { SearchOptions } from "./types";

/** How many grams does this ingredient line represent, given the resolved food? */
export function ingredientGrams(food: FoodItem, ing: Ingredient): number {
  const unit = ing.unit?.trim().toLowerCase();
  if (unit && unit !== "serving" && (isMass(unit) || isVolume(unit))) {
    return toGrams(ing.amount, unit); // volume assumes ~1 g/ml
  }
  if (ing.servingLabel) {
    const s = food.servings.find((x) => x.label.toLowerCase() === ing.servingLabel!.toLowerCase());
    return (s?.grams ?? food.defaultServing?.grams ?? 100) * ing.amount;
  }
  // "serving" or unit-less → multiples of the default serving
  return (food.defaultServing?.grams ?? 100) * ing.amount;
}

async function resolveFood(service: NutritionService, ing: Ingredient, opts?: SearchOptions): Promise<FoodItem | null> {
  if (ing.foodId) return service.getFood(ing.foodId, opts);
  if (ing.barcode) return service.getByBarcode(ing.barcode, opts);
  if (ing.query) return (await service.searchFoods(ing.query, { ...opts, limit: 1 }))[0] ?? null;
  return null;
}

export async function resolveIngredient(service: NutritionService, ing: Ingredient, opts?: SearchOptions): Promise<ResolvedIngredient> {
  let food: FoodItem | null = null;
  try {
    food = await resolveFood(service, ing, opts);
  } catch {
    food = null;
  }
  if (!food) {
    return { input: ing, food: null, grams: 0, nutrients: {}, unresolved: `could not resolve ${ing.query ?? ing.barcode ?? ing.foodId ?? "ingredient"}` };
  }
  const grams = ingredientGrams(food, ing);
  return { input: ing, food, grams, nutrients: scaleProfile(food.per100g, grams) };
}

export async function analyzeRecipe(
  service: NutritionService,
  input: { ingredients: Ingredient[]; servings?: number },
  opts?: SearchOptions,
): Promise<RecipeAnalysis> {
  const ingredients = await Promise.all(input.ingredients.map((i) => resolveIngredient(service, i, opts)));
  const servings = Math.max(1, input.servings ?? 1);
  const total = addProfiles(...ingredients.map((i) => i.nutrients));
  const totalGrams = ingredients.reduce((n, i) => n + i.grams, 0);
  return {
    ingredients,
    servings,
    totalGrams,
    total,
    perServing: multiplyProfile(total, 1 / servings),
    unresolvedCount: ingredients.filter((i) => i.food === null).length,
  };
}

/** Sum any set of already-scaled nutrient profiles (a meal, a day, a week). */
export function sumProfiles(profiles: NutrientProfile[]): NutrientTotals {
  return { entries: profiles.length, total: addProfiles(...profiles) };
}
