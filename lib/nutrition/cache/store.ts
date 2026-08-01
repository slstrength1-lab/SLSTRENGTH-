/**
 * Cache abstraction. Foods are effectively static, so caching is what lets the
 * free API tiers scale to thousands of users. The in-memory store ships by
 * default; a Postgres/Redis-backed CacheStore drops in later (when the OS
 * migrates off Notion) with zero changes to the service — same interface.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** Cache TTLs by data kind (foods are stable; searches churn a bit). */
export const CACHE_TTL = {
  food: 30 * 24 * 60 * 60 * 1000, // 30 days — a food's macros don't change
  barcode: 30 * 24 * 60 * 60 * 1000,
  search: 24 * 60 * 60 * 1000, // 1 day
} as const;

export function cacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p !== undefined && p !== "").join(":").toLowerCase();
}
