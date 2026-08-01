/** Typed error taxonomy so callers (and tests) can branch on failure kind. */

export type NutritionErrorCode =
  | "config"
  | "not_found"
  | "rate_limit"
  | "timeout"
  | "network"
  | "provider"
  | "all_failed"
  | "validation";

export class NutritionError extends Error {
  code: NutritionErrorCode;
  provider?: string;
  status?: number;
  retryable: boolean;
  constructor(
    code: NutritionErrorCode,
    message: string,
    opts: { provider?: string; status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = "NutritionError";
    this.code = code;
    this.provider = opts.provider;
    this.status = opts.status;
    // Default retryability by code; explicit override wins.
    this.retryable = opts.retryable ?? ["rate_limit", "timeout", "network", "provider"].includes(code);
  }
}

export const configError = (m: string) => new NutritionError("config", m);
export const notFound = (m: string, provider?: string) => new NutritionError("not_found", m, { provider, retryable: false });
export const validationError = (m: string) => new NutritionError("validation", m, { retryable: false });
export const rateLimited = (provider: string, status = 429) =>
  new NutritionError("rate_limit", `${provider}: rate limited`, { provider, status });
export const timeoutError = (provider: string) => new NutritionError("timeout", `${provider}: request timed out`, { provider });

/** Raised when every capable provider failed for a request. */
export class AllProvidersFailedError extends NutritionError {
  failures: { provider: string; error: string }[];
  constructor(op: string, failures: { provider: string; error: string }[]) {
    super("all_failed", `All providers failed for ${op}`, { retryable: true });
    this.name = "AllProvidersFailedError";
    this.failures = failures;
  }
}
