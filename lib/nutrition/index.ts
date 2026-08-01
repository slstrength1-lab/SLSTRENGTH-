/**
 * Public API for the Nutrition Data Integration Layer.
 *
 * The permanent nutrition backbone for SL Strength OS, HPOS, athlete/client
 * plans, personal nutrition, and every AI agent. One service, three providers
 * (USDA → Open Food Facts → FatSecret) behind a swappable interface with
 * automatic fallback, caching, retries, and rate-limit protection.
 *
 * Typical use:
 *   import { searchFoods, getByBarcode, analyzeRecipe } from "@/lib/nutrition";
 *   const foods = await searchFoods("chicken breast");
 *
 * Or hold the service directly:
 *   import { getNutritionService } from "@/lib/nutrition";
 */

// types & model
export * from "./types";
export { NutritionError, AllProvidersFailedError, type NutritionErrorCode } from "./errors";

// service + config
export { NutritionService, type ServiceEvent, type Logger } from "./service";
export {
  getNutritionService,
  createNutritionService,
  nutritionConfigStatus,
  buildProviders,
  providerConfigFromEnv,
  type NutritionConfigStatus,
} from "./config";

// providers (for custom wiring / adding providers)
export type { NutritionProvider, ProviderConfig } from "./providers/provider";
export { canonicalId, splitCanonicalId } from "./providers/provider";
export { UsdaProvider } from "./providers/usda";
export { OpenFoodFactsProvider } from "./providers/openfoodfacts";
export { FatSecretProvider } from "./providers/fatsecret";

// cache
export { MemoryCache } from "./cache/memory";
export { type CacheStore, CACHE_TTL, cacheKey } from "./cache/store";

// recipes / totals
export { analyzeRecipe, resolveIngredient, ingredientGrams, sumProfiles } from "./recipe";

// pure helpers
export { scaleProfile, addProfiles, multiplyProfile, roundProfile, toPer100g, num } from "./normalize";
export { toGrams, gramsToOz, ozToGrams, lbToKg, kgToLb, isMass, isVolume } from "./units";

// per-user memory
export { type FoodMemory, InMemoryFoodMemory } from "./history";

// agent façade (the surface AI agents use)
export * as agents from "./agents/facade";
