/** Map a NutritionError code to an HTTP status for API routes. */
import { NutritionError } from "./errors";

export function statusForError(e: unknown): { status: number; error: string; code: string } {
  if (e instanceof NutritionError) {
    const map: Record<string, number> = {
      validation: 400,
      not_found: 404,
      rate_limit: 429,
      timeout: 504,
      network: 502,
      provider: 502,
      all_failed: 502,
      config: 503,
    };
    return { status: map[e.code] ?? 500, error: e.message, code: e.code };
  }
  return { status: 500, error: (e as Error)?.message ?? "internal error", code: "internal" };
}
