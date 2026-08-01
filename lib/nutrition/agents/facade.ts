/**
 * Agent-friendly façade. Every AI agent (Nutrition, Meal-Planning, Recovery,
 * Performance, Strength, Programming, Medical) imports from here and gets clean,
 * typed data — never raw HTTP, never a specific provider. This is the seam the
 * future AI Nutrition Agent builds on.
 */
import type { FoodItem, Ingredient, NutrientProfile, RecipeAnalysis, SearchOptions } from "../types";
import { getNutritionService } from "../config";
import { analyzeRecipe as _analyze, sumProfiles, ingredientGrams } from "../recipe";
import { scaleProfile, roundProfile, addProfiles, multiplyProfile } from "../normalize";
import { MACRO_KEYS } from "../types";

export function searchFoods(query: string, opts?: SearchOptions): Promise<FoodItem[]> {
  return getNutritionService().searchFoods(query, opts);
}
export function getByBarcode(barcode: string, opts?: SearchOptions): Promise<FoodItem | null> {
  return getNutritionService().getByBarcode(barcode, opts);
}
export function getFood(id: string, opts?: SearchOptions): Promise<FoodItem | null> {
  return getNutritionService().getFood(id, opts);
}
export function analyzeRecipe(input: { ingredients: Ingredient[]; servings?: number }, opts?: SearchOptions): Promise<RecipeAnalysis> {
  return _analyze(getNutritionService(), input, opts);
}

/** Nutrients for a specific amount (grams) of a resolved food. */
export function nutrientsFor(food: FoodItem, grams: number): NutrientProfile {
  return roundProfile(scaleProfile(food.per100g, grams));
}

/** Nutrients for an ingredient line (amount + unit/serving), against a resolved food. */
export function nutrientsForIngredient(food: FoodItem, ing: Ingredient): NutrientProfile {
  return roundProfile(scaleProfile(food.per100g, ingredientGrams(food, ing)));
}

/** Just the four macros (rounded), handy for quick agent reasoning. */
export function macrosOf(profile: NutrientProfile): Pick<NutrientProfile, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar"> {
  const out: NutrientProfile = {};
  for (const k of MACRO_KEYS) if (typeof profile[k] === "number") out[k] = profile[k];
  return roundProfile(out);
}

/** Sum scaled profiles → a meal total (rounded). */
export function mealTotals(profiles: NutrientProfile[]): NutrientProfile {
  return roundProfile(sumProfiles(profiles).total);
}
/** Day = sum of meals; week = sum of days. Same operation, different grouping. */
export function dailyTotals(meals: NutrientProfile[]): NutrientProfile {
  return roundProfile(addProfiles(...meals));
}
export function weeklyTotals(days: NutrientProfile[]): NutrientProfile {
  return roundProfile(addProfiles(...days));
}
/** Average daily intake across a week (for coaching targets). */
export function weeklyAverage(days: NutrientProfile[]): NutrientProfile {
  return days.length ? roundProfile(multiplyProfile(addProfiles(...days), 1 / days.length)) : {};
}
