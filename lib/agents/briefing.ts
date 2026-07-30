/**
 * A1 — Executive Strategist & Briefing (Phase 1).
 *
 * Reads the whole-business context (deterministic analytics) and synthesizes a
 * daily executive briefing: what to know, what to do first. Read-only and
 * lowest-risk — it never touches a client, so it emits a `safe`-tier
 * recommendation the coach reads in the approval inbox. See
 * docs/ai-architecture-review.md (Phase 1).
 */
import { assembleBusinessContext } from "./shared/context";
import { generate } from "./shared/llm";
import { notion } from "@/lib/notion";
import type { Recommendation } from "@/lib/types";

const SYSTEM = `You are the Executive Strategist for SL Strength, Shane Lanteigne's
premium online strength & nutrition coaching business. You brief the owner each
day like a sharp chief of staff: concise, specific, and action-oriented.

Given a snapshot of live business metrics, produce a short briefing that:
- leads with the single most important thing to know today,
- calls out risks (churn, past-due, capacity, dropping compliance) plainly,
- surfaces the highest-leverage opportunities (hot leads, consults, revenue gap),
- ends with 3-5 concrete priorities for today, most important first.

Be direct and grounded ONLY in the numbers provided. Do not invent clients,
figures, or events. If the business is healthy and quiet, say so briefly.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    brief: { type: "string" },
    priorities: { type: "array", items: { type: "string" } },
    confidence: { type: "integer" },
  },
  required: ["headline", "brief", "priorities", "confidence"],
};

interface BriefingOut {
  headline: string;
  brief: string;
  priorities: string[];
  confidence: number;
}

/** Generate today's executive briefing and file it in the ledger. Null if the AI layer isn't configured. */
export async function runBriefing(nowISO: string): Promise<Recommendation | null> {
  const ctx = await assembleBusinessContext(nowISO);
  const result = await generate<BriefingOut>({
    system: SYSTEM,
    user: `${ctx.brief}\n\nWrite today's executive briefing for the owner.`,
    schema: SCHEMA,
    effort: "medium",
    maxTokens: 4000,
  });
  if (!result) return null;

  const draft = [
    result.brief.trim(),
    "",
    "Today's priorities:",
    ...(result.priorities ?? []).map((p) => `• ${p}`),
  ].join("\n");

  return notion.createRecommendation({
    title: result.headline?.trim() || `Daily briefing — ${ctx.asOf}`,
    kind: "Briefing",
    source: "Strategist",
    riskTier: "safe",
    summary: "Daily executive briefing generated from your live business metrics.",
    draft,
    confidence: typeof result.confidence === "number" ? result.confidence : undefined,
    dedupKey: `briefing:${ctx.asOf}`,
  });
}
