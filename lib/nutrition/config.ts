/**
 * Configuration + provider wiring. Keys come from env only — never hardcoded.
 * A missing key disables just that provider (with a helpful warning); the
 * service keeps working on whatever remains (USDA + OFF, or OFF alone).
 */
import type { HttpDeps } from "./http/client";
import type { NutritionProvider, ProviderConfig } from "./providers/provider";
import { UsdaProvider } from "./providers/usda";
import { OpenFoodFactsProvider } from "./providers/openfoodfacts";
import { FatSecretProvider } from "./providers/fatsecret";
import { NutritionService } from "./service";
import { MemoryCache } from "./cache/memory";
import type { CacheStore } from "./cache/store";

const env = (k: string): string | undefined => {
  const v = typeof process !== "undefined" ? process.env?.[k] : undefined;
  return v && v.trim() ? v.trim() : undefined;
};

export interface NutritionConfigStatus {
  ready: boolean; // at least one provider usable (OFF always is)
  providers: { id: string; label: string; enabled: boolean; reason?: string }[];
  warnings: string[];
}

/** Inspect env and report which providers are live — for a startup/health check. */
export function nutritionConfigStatus(): NutritionConfigStatus {
  const usda = Boolean(env("USDA_FDC_API_KEY"));
  const fs = Boolean(env("FATSECRET_CLIENT_ID") && env("FATSECRET_CLIENT_SECRET"));
  const warnings: string[] = [];
  if (!usda) warnings.push("USDA_FDC_API_KEY not set — primary whole-food + micronutrient source is OFF. Get a free key at https://fdc.nal.usda.gov/api-key-signup.html");
  if (!fs) warnings.push("FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET not set — restaurant/branded enrichment disabled. Register a free app at https://platform.fatsecret.com/platform-api");
  return {
    ready: true, // Open Food Facts needs no key, so nutrition is always at least partly live
    providers: [
      { id: "usda", label: "USDA FoodData Central", enabled: usda, reason: usda ? undefined : "USDA_FDC_API_KEY missing" },
      { id: "off", label: "Open Food Facts", enabled: true },
      { id: "fatsecret", label: "FatSecret", enabled: fs, reason: fs ? undefined : "FatSecret credentials missing" },
    ],
    warnings,
  };
}

export function providerConfigFromEnv(deps: HttpDeps = {}): ProviderConfig {
  return {
    usdaApiKey: env("USDA_FDC_API_KEY"),
    fatSecretClientId: env("FATSECRET_CLIENT_ID"),
    fatSecretClientSecret: env("FATSECRET_CLIENT_SECRET"),
    userAgent: env("NUTRITION_USER_AGENT") || "SLStrengthOS-Nutrition/1.0 (+https://slstrength.netlify.app)",
    ...deps,
  };
}

/** Build the provider list in fallback priority order (only the enabled ones). */
export function buildProviders(cfg: ProviderConfig): NutritionProvider[] {
  return [new UsdaProvider(cfg), new OpenFoodFactsProvider(cfg), new FatSecretProvider(cfg)].filter((p) => p.enabled);
}

let _shared: NutritionService | null = null;

/**
 * The shared singleton nutrition service used across the app + agents.
 * Everything calls THIS — never a provider directly.
 */
export function getNutritionService(): NutritionService {
  if (!_shared) {
    const cfg = providerConfigFromEnv();
    _shared = new NutritionService(buildProviders(cfg), new MemoryCache());
  }
  return _shared;
}

/** Build a custom service (tests, or a different cache backend at scale). */
export function createNutritionService(opts: { providers?: NutritionProvider[]; cache?: CacheStore; deps?: HttpDeps } = {}): NutritionService {
  const cfg = providerConfigFromEnv(opts.deps);
  return new NutritionService(opts.providers ?? buildProviders(cfg), opts.cache ?? new MemoryCache());
}
