/**
 * The contract every nutrition source implements. Add a provider = implement
 * this one interface and register it — no feature code changes. Never hardcode a
 * provider anywhere else.
 */
import type { Capability, FoodItem, SearchOptions } from "../types";
import type { HttpDeps } from "../http/client";

export interface ProviderConfig extends HttpDeps {
  /** Provider-specific credentials, read from env by config.ts. */
  usdaApiKey?: string;
  fatSecretClientId?: string;
  fatSecretClientSecret?: string;
  /** User-Agent required by Open Food Facts (and polite everywhere). */
  userAgent?: string;
}

export interface NutritionProvider {
  readonly id: string;
  readonly label: string; // human/attribution name, e.g. "USDA FoodData Central"
  readonly capabilities: ReadonlySet<Capability>;
  /** True when credentials/config are present so the provider can actually run. */
  readonly enabled: boolean;

  searchFoods(query: string, opts?: SearchOptions): Promise<FoodItem[]>;
  getByBarcode(barcode: string, opts?: SearchOptions): Promise<FoodItem | null>;
  getById(providerFoodId: string, opts?: SearchOptions): Promise<FoodItem | null>;
}

export function canonicalId(provider: string, providerFoodId: string): string {
  return `${provider}:${providerFoodId}`;
}

export function splitCanonicalId(id: string): { provider: string; providerFoodId: string } | null {
  const i = id.indexOf(":");
  if (i < 0) return null;
  return { provider: id.slice(0, i), providerFoodId: id.slice(i + 1) };
}
