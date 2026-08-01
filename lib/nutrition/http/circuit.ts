/**
 * Circuit breaker — after N consecutive failures a provider is "open" (skipped)
 * for a cooldown, so the service fails over fast instead of hammering a dead
 * endpoint. One half-open trial probes recovery. `now` injectable for tests.
 */
export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private halfOpen = false;
  constructor(
    private threshold = 4,
    private cooldownMs = 30_000,
    private now: () => number = () => Date.now(),
  ) {}

  state(): CircuitState {
    if (this.openUntil > this.now()) return "open";
    if (this.openUntil !== 0) return "half_open";
    return "closed";
  }

  /** May a request proceed? Transitions open→half_open when cooldown elapses. */
  canRequest(): boolean {
    if (this.openUntil > this.now()) return false;
    if (this.openUntil !== 0) this.halfOpen = true; // one trial allowed
    return true;
  }

  success() {
    this.failures = 0;
    this.openUntil = 0;
    this.halfOpen = false;
  }

  failure() {
    this.failures += 1;
    if (this.halfOpen || this.failures >= this.threshold) {
      this.openUntil = this.now() + this.cooldownMs;
      this.halfOpen = false;
    }
  }
}
