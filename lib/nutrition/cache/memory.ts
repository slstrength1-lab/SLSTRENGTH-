/**
 * In-memory LRU cache with per-entry TTL. Zero deps, safe default for a single
 * server process. Swap for a shared CacheStore (Redis/Postgres) at scale.
 */
import type { CacheStore } from "./store";

interface Entry {
  value: unknown;
  expires: number; // epoch ms, Infinity if none
}

export class MemoryCache implements CacheStore {
  private map = new Map<string, Entry>();
  private max: number;
  private now: () => number;

  constructor(opts: { max?: number; now?: () => number } = {}) {
    this.max = opts.max ?? 5000;
    // Injectable clock so tests can advance time deterministically.
    this.now = opts.now ?? (() => Date.now());
  }

  async get<T>(key: string): Promise<T | undefined> {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    // LRU touch: re-insert to move to newest position.
    this.map.delete(key);
    this.map.set(key, e);
    return e.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: ttlMs ? this.now() + ttlMs : Infinity });
    // Evict oldest while over capacity.
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
