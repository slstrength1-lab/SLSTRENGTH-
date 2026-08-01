/**
 * Canonical nutrition data model — the single shape every provider normalizes to.
 *
 * Framework-agnostic (no Next.js / Notion imports) so this whole module can be
 * lifted into a shared `@sl/nutrition` package for HPOS, mobile, and web without
 * a rewrite. Feature code and AI agents only ever see these types — never a
 * provider's raw response.
 */

/* ------------------------------------------------------------------ */
/* Providers                                                          */
/* ------------------------------------------------------------------ */

export type ProviderId = "usda" | "off" | "fatsecret" | (string & {});

/** What a provider can answer. The service routes by capability. */
export type Capability = "search" | "barcode" | "branded" | "restaurant" | "recipe" | "micros";

/** USDA-style data provenance, normalized across providers. */
export type FoodDataType = "foundation" | "sr_legacy" | "survey" | "branded" | "generic";

/* ------------------------------------------------------------------ */
/* Nutrients                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every nutrient we carry, in one flat profile. Canonical units are fixed here
 * (see NUTRIENT_UNITS) so math and display never guess. All values are for a
 * given basis (per 100 g on a FoodItem; per-portion after scaling).
 */
export interface NutrientProfile {
  // macros
  calories?: number; // kcal
  protein?: number; // g
  carbs?: number; // g
  fat?: number; // g
  satFat?: number; // g
  transFat?: number; // g
  fiber?: number; // g
  sugar?: number; // g
  addedSugar?: number; // g
  // electrolytes / sterols
  sodium?: number; // mg
  cholesterol?: number; // mg
  potassium?: number; // mg
  // micros
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  zinc?: number; // mg
  phosphorus?: number; // mg
  vitaminA?: number; // µg RAE
  vitaminC?: number; // mg
  vitaminD?: number; // µg
  vitaminK?: number; // µg
  vitaminE?: number; // mg
  water?: number; // g
  omega3?: number; // g
  omega6?: number; // g
}

export type NutrientKey = keyof NutrientProfile;

/** Canonical unit per nutrient — used for normalization and display. */
export const NUTRIENT_UNITS: Record<NutrientKey, string> = {
  calories: "kcal",
  protein: "g",
  carbs: "g",
  fat: "g",
  satFat: "g",
  transFat: "g",
  fiber: "g",
  sugar: "g",
  addedSugar: "g",
  sodium: "mg",
  cholesterol: "mg",
  potassium: "mg",
  calcium: "mg",
  iron: "mg",
  magnesium: "mg",
  zinc: "mg",
  phosphorus: "mg",
  vitaminA: "µg",
  vitaminC: "mg",
  vitaminD: "µg",
  vitaminK: "µg",
  vitaminE: "mg",
  water: "g",
  omega3: "g",
  omega6: "g",
};

export const NUTRIENT_KEYS = Object.keys(NUTRIENT_UNITS) as NutrientKey[];
export const MACRO_KEYS: NutrientKey[] = ["calories", "protein", "carbs", "fat", "fiber", "sugar"];

/* ------------------------------------------------------------------ */
/* Foods & servings                                                   */
/* ------------------------------------------------------------------ */

/** A named portion. `grams` is the mass of one of this serving (the anchor for scaling). */
export interface Serving {
  label: string; // e.g. "1 cup", "1 medium", "100 g"
  grams: number; // mass of ONE such serving
  amount?: number; // household amount, e.g. 1
  unit?: string; // household unit, e.g. "cup"
  isDefault?: boolean;
}

/** The canonical food record. `per100g` is the source of truth; servings scale from it. */
export interface FoodItem {
  id: string; // canonical id: `${provider}:${providerFoodId}`
  provider: ProviderId;
  providerFoodId: string;
  name: string;
  brand?: string;
  restaurant?: string;
  barcode?: string; // UPC/EAN/GTIN when known
  dataType: FoodDataType;
  servings: Serving[];
  defaultServing?: Serving;
  per100g: NutrientProfile;
  /** Provider provenance for attribution / debugging (e.g. "USDA FoodData Central"). */
  source: string;
  fetchedAt: string; // ISO
}

export interface SearchOptions {
  limit?: number;
  /** Restrict to branded / restaurant / whole foods when a provider supports it. */
  dataTypes?: FoodDataType[];
  /** Skip the cache for this call. */
  fresh?: boolean;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

/* ------------------------------------------------------------------ */
/* Recipes, meals, totals                                             */
/* ------------------------------------------------------------------ */

/** One line of a recipe/meal: a food + how much of it. */
export interface Ingredient {
  /** Either a resolved food id, a barcode, or a free-text query to resolve. */
  foodId?: string;
  barcode?: string;
  query?: string;
  /** Quantity. If `unit` is a mass/volume unit it's converted; else it multiplies `servingLabel`. */
  amount: number;
  unit?: string; // "g", "oz", "cup", "serving", ...
  servingLabel?: string; // pick a named serving from the food
  note?: string;
}

export interface ResolvedIngredient {
  input: Ingredient;
  food: FoodItem | null;
  grams: number;
  nutrients: NutrientProfile; // scaled to `grams`
  unresolved?: string; // reason, when food is null
}

export interface RecipeAnalysis {
  ingredients: ResolvedIngredient[];
  servings: number;
  totalGrams: number;
  total: NutrientProfile; // whole recipe
  perServing: NutrientProfile; // total / servings
  unresolvedCount: number;
}

/** A logged meal/day/week is just a set of scaled entries summed. */
export interface NutrientTotals {
  entries: number;
  total: NutrientProfile;
}
