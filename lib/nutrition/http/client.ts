/**
 * Resilient JSON HTTP client shared by all providers: injectable `fetch` (so
 * tests run fully offline and prod can plug a proxy dispatcher), per-provider
 * rate limiting + circuit breaker, timeout, and retry with exponential backoff.
 */
import { NutritionError, rateLimited, timeoutError } from "../errors";
import { TokenBucket } from "./ratelimit";
import { CircuitBreaker } from "./circuit";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface HttpDeps {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface HttpOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Per-provider HTTP wrapper. Construct one; reuse for every call to that host. */
export class Http {
  private fetchImpl: FetchLike;
  private sleep: (ms: number) => Promise<void>;
  private now: () => number;
  readonly bucket: TokenBucket;
  readonly circuit: CircuitBreaker;

  constructor(
    readonly provider: string,
    opts: { ratePerSec: number; burst: number; circuitThreshold?: number; cooldownMs?: number } & HttpDeps,
  ) {
    this.fetchImpl = opts.fetchImpl ?? ((u, i) => fetch(u, i));
    this.sleep = opts.sleep ?? defaultSleep;
    this.now = opts.now ?? (() => Date.now());
    this.bucket = new TokenBucket(opts.burst, opts.ratePerSec, this.now);
    this.circuit = new CircuitBreaker(opts.circuitThreshold ?? 4, opts.cooldownMs ?? 30_000, this.now);
  }

  async json<T>(url: string, opts: HttpOptions = {}): Promise<T> {
    if (!this.circuit.canRequest()) {
      throw new NutritionError("provider", `${this.provider}: circuit open`, { provider: this.provider, retryable: true });
    }
    const retries = opts.retries ?? 2;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Rate-limit gate (wait for a token, capped so we don't hang forever).
      for (let i = 0; i < 20; i++) {
        const t = this.bucket.take();
        if (t.ok) break;
        await this.sleep(Math.min(t.waitMs, 2000));
      }
      try {
        const res = await this.doFetch(url, opts);
        if (res.status === 429) throw rateLimited(this.provider);
        if (res.status >= 500) {
          throw new NutritionError("provider", `${this.provider}: HTTP ${res.status}`, {
            provider: this.provider,
            status: res.status,
            retryable: true,
          });
        }
        if (res.status === 404) {
          this.circuit.success();
          throw new NutritionError("not_found", `${this.provider}: not found`, { provider: this.provider, retryable: false });
        }
        if (!res.ok) {
          this.circuit.success(); // a 4xx is a real answer, not an outage
          throw new NutritionError("provider", `${this.provider}: HTTP ${res.status}`, {
            provider: this.provider,
            status: res.status,
            retryable: false,
          });
        }
        const data = (await res.json()) as T;
        this.circuit.success();
        return data;
      } catch (err) {
        const e = err as NutritionError;
        const retryable = e instanceof NutritionError ? e.retryable : true;
        if (retryable) this.circuit.failure();
        if (!retryable || attempt >= retries) throw normalize(e, this.provider);
        // exponential backoff: 300ms, 900ms, 2700ms (+ small jitter-free determinism)
        await this.sleep(300 * 3 ** attempt);
        attempt += 1;
      }
    }
  }

  private async doFetch(url: string, opts: HttpOptions): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (opts.signal) opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      return await this.fetchImpl(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) throw timeoutError(this.provider);
      throw new NutritionError("network", `${this.provider}: ${(err as Error).message}`, {
        provider: this.provider,
        retryable: true,
        cause: err,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function normalize(e: unknown, provider: string): NutritionError {
  if (e instanceof NutritionError) return e;
  return new NutritionError("provider", `${provider}: ${(e as Error)?.message ?? "unknown error"}`, { provider, cause: e });
}
