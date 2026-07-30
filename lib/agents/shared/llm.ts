/**
 * LLM wrapper — the single seam between the AI advisors and Claude. Mirrors the
 * Notion adapter's philosophy: one file talks to the model, everything gated on
 * a key, graceful when unset. With ANTHROPIC_API_KEY absent the advisors simply
 * produce nothing (no fabricated recommendations — same "no fake data" rule the
 * rest of the app follows).
 *
 * Uses the official SDK, adaptive thinking, and structured (schema-validated)
 * output so an advisor's result is typed before it ever reaches the ledger.
 */
import Anthropic from "@anthropic-ai/sdk";

export const isAgentLive = Boolean(process.env.ANTHROPIC_API_KEY);

/** Overridable model. Defaults to the latest Opus; set a cheaper model for volume. */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

/**
 * The reason the most recent generate() returned null (API error, refusal, or
 * unparseable output). Read by the agent route so the coach sees the real cause
 * inline instead of a generic "nothing produced". Best-effort/last-write-wins —
 * fine for the single-operator approvals flow.
 */
export let lastAgentError: string | null = null;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface GenerateOptions {
  system: string;
  user: string;
  /** JSON Schema — when provided, the result is parsed & returned as T. */
  schema?: Record<string, unknown>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

/**
 * Generate a completion. Returns parsed JSON (when `schema` is given) or raw
 * text; null when the agent layer isn't configured or on any error — callers
 * treat null as "no recommendation produced".
 */
export async function generate<T = string>(opts: GenerateOptions): Promise<T | null> {
  if (!isAgentLive) return null;
  lastAgentError = null;
  try {
    // Built as a loose object: output_config/effort aren't in every SDK typing yet.
    const req: Record<string, unknown> = {
      model: MODEL,
      max_tokens: opts.maxTokens ?? 6000,
      thinking: { type: "adaptive" },
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      output_config: {
        effort: opts.effort ?? "medium",
        ...(opts.schema ? { format: { type: "json_schema", schema: opts.schema } } : {}),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client().messages.create(req as any);
    const u = res.usage ?? {};
    console.info(`[agent] ${MODEL} in=${u.input_tokens ?? "?"} out=${u.output_tokens ?? "?"}`);
    if (res.stop_reason === "refusal") {
      lastAgentError = "the model declined this request (refusal)";
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlock = (res.content ?? []).find((b: any) => b.type === "text");
    const text: string = textBlock?.text ?? "";
    if (opts.schema) {
      if (!text) {
        lastAgentError = `model returned no text (stop_reason=${res.stop_reason ?? "?"})`;
        return null;
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        lastAgentError = "structured output did not parse as JSON";
        console.warn("[agent] structured output did not parse as JSON");
        return null;
      }
    }
    return text as unknown as T;
  } catch (err) {
    lastAgentError = err instanceof Error ? err.message : String(err);
    console.warn("[agent] generate failed:", lastAgentError);
    return null;
  }
}
