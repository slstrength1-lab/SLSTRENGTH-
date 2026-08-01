/**
 * Token-bucket rate limiter — one per provider — so we never trip a free-tier
 * limit. `now` is injectable for deterministic tests.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private capacity: number,
    private refillPerSec: number,
    private now: () => number = () => Date.now(),
  ) {
    this.tokens = capacity;
    this.lastRefill = now();
  }

  private refill() {
    const t = this.now();
    const elapsed = (t - this.lastRefill) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
      this.lastRefill = t;
    }
  }

  /** Try to take one token. Returns 0 if taken now, else ms to wait before one is free. */
  take(): { ok: boolean; waitMs: number } {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { ok: true, waitMs: 0 };
    }
    const deficit = 1 - this.tokens;
    return { ok: false, waitMs: Math.ceil((deficit / this.refillPerSec) * 1000) };
  }

  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
