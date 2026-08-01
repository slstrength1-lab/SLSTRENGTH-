/**
 * NutritionService — the one façade everything calls. Orchestrates providers
 * with automatic fallback + caching. If provider #1 misses or errors, it queries
 * #2, then #3, with no caller involvement.
 */
import type { Capability, FoodItem, SearchOptions } from "./types";
import { AllProvidersFailedError, NutritionError, validationError } from "./errors";
import { CACHE_TTL, cacheKey, type CacheStore } from "./cache/store";
import { MemoryCache } from "./cache/memory";
import { splitCanonicalId, type NutritionProvider } from "./providers/provider";

export interface ServiceEvent {
  op: string;
  provider?: string;
  ok: boolean;
  cached?: boolean;
  ms?: number;
  error?: string;
}
export type Logger = (e: ServiceEvent) => void;

export class NutritionService {
  private cache: CacheStore;
  private log: Logger;
  constructor(
    private providers: NutritionProvider[],
    cache?: CacheStore,
    opts: { logger?: Logger } = {},
  ) {
    this.cache = cache ?? new MemoryCache();
    this.log = opts.logger ?? (() => {});
  }

  /** Providers that advertise a capability, in configured (priority) order. */
  private capable(cap: Capability): NutritionProvider[] {
    return this.providers.filter((p) => p.enabled && p.capabilities.has(cap));
  }

  listProviders(): { id: string; label: string; capabilities: string[] }[] {
    return this.providers.map((p) => ({ id: p.id, label: p.label, capabilities: [...p.capabilities] }));
  }

  /* ---- search ------------------------------------------------------ */
  async searchFoods(query: string, opts: SearchOptions = {}): Promise<FoodItem[]> {
    const q = query.trim();
    if (q.length < 2) throw validationError("search query must be at least 2 characters");
    const key = cacheKey("search", q, opts.limit ?? 15);
    if (!opts.fresh) {
      const hit = await this.cache.get<FoodItem[]>(key);
      if (hit) {
        this.log({ op: "search", ok: true, cached: true });
        return hit;
      }
    }
    const failures: { provider: string; error: string }[] = [];
    for (const p of this.capable("search")) {
      const t = Date.now();
      try {
        const foods = await p.searchFoods(q, opts);
        this.log({ op: "search", provider: p.id, ok: true, ms: Date.now() - t });
        if (foods.length) {
          await this.cache.set(key, foods, CACHE_TTL.search);
          return foods;
        }
      } catch (e) {
        failures.push({ provider: p.id, error: msg(e) });
        this.log({ op: "search", provider: p.id, ok: false, ms: Date.now() - t, error: msg(e) });
      }
    }
    if (failures.length && failures.length === this.capable("search").length) {
      throw new AllProvidersFailedError("search", failures);
    }
    return []; // providers responded, just no matches
  }

  /* ---- barcode ----------------------------------------------------- */
  async getByBarcode(barcode: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    const code = barcode.replace(/\D/g, "");
    if (code.length < 6) throw validationError("barcode must be at least 6 digits");
    const key = cacheKey("barcode", code);
    if (!opts.fresh) {
      const hit = await this.cache.get<FoodItem>(key);
      if (hit) {
        this.log({ op: "barcode", ok: true, cached: true });
        return hit;
      }
    }
    // Barcode order favors OFF, then FatSecret, then USDA — reorder capable set.
    const order = ["off", "fatsecret", "usda"];
    const providers = this.capable("barcode").sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const failures: { provider: string; error: string }[] = [];
    for (const p of providers) {
      const t = Date.now();
      try {
        const food = await p.getByBarcode(code, opts);
        this.log({ op: "barcode", provider: p.id, ok: true, ms: Date.now() - t });
        if (food) {
          await this.cache.set(key, food, CACHE_TTL.barcode);
          return food;
        }
      } catch (e) {
        failures.push({ provider: p.id, error: msg(e) });
        this.log({ op: "barcode", provider: p.id, ok: false, ms: Date.now() - t, error: msg(e) });
      }
    }
    if (failures.length && failures.length === providers.length) throw new AllProvidersFailedError("barcode", failures);
    return null;
  }

  /* ---- by id ------------------------------------------------------- */
  async getFood(id: string, opts: SearchOptions = {}): Promise<FoodItem | null> {
    const split = splitCanonicalId(id);
    if (!split) throw validationError(`invalid food id "${id}" (expected provider:id)`);
    const key = cacheKey("food", id);
    if (!opts.fresh) {
      const hit = await this.cache.get<FoodItem>(key);
      if (hit) {
        this.log({ op: "food", ok: true, cached: true });
        return hit;
      }
    }
    const provider = this.providers.find((p) => p.id === split.provider && p.enabled);
    if (!provider) throw validationError(`provider "${split.provider}" is not available`);
    const t = Date.now();
    try {
      const food = await provider.getById(split.providerFoodId, opts);
      this.log({ op: "food", provider: provider.id, ok: true, ms: Date.now() - t });
      if (food) await this.cache.set(key, food, CACHE_TTL.food);
      return food;
    } catch (e) {
      this.log({ op: "food", provider: provider.id, ok: false, ms: Date.now() - t, error: msg(e) });
      if (e instanceof NutritionError && e.code === "not_found") return null;
      throw e;
    }
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
