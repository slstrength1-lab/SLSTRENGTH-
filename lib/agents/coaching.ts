/**
 * A2 — Client Coaching Advisor (Phase 2).
 *
 * Reads one client's full state and proposes this week's coaching actions:
 * a check-in reply, a program tweak, a nutrition adjustment, a nudge message.
 * Everything is client-facing or a plan change, so each proposal is `review`
 * tier — it waits in the approval inbox for Shane to edit/approve before it
 * ever reaches the client.
 */
import { assembleClientContext } from "./shared/context";
import { generate } from "./shared/llm";
import { notion } from "@/lib/notion";
import type { Recommendation, RecommendationKind } from "@/lib/types";

const SYSTEM = `You are the Client Coaching Advisor for SL Strength, an elite online
strength & nutrition coaching practice. Given one client's current state, propose
the highest-leverage coaching actions for this week.

Return 1-4 concrete actions. Each action is one of:
- "Check-in Response": a warm, specific reply to the client's latest check-in.
- "Program Update": a proposed training adjustment (progression, deload, swap).
- "Nutrition Update": a proposed macro/strategy adjustment.
- "Client Message": a proactive nudge (accountability, encouragement, reminder).

Write the "draft" as the exact text/notes Shane would send or apply — ready to
approve. Ground everything ONLY in the client's data; never invent numbers,
lifts, or history. If the client is thriving and nothing needs changing, return a
single short encouraging "Check-in Response". Coach in Shane's voice: direct,
supportive, expert.`;

const KINDS: RecommendationKind[] = ["Check-in Response", "Program Update", "Nutrition Update", "Client Message"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: KINDS },
          title: { type: "string" },
          summary: { type: "string" },
          draft: { type: "string" },
          confidence: { type: "integer" },
        },
        required: ["kind", "title", "summary", "draft", "confidence"],
      },
    },
  },
  required: ["actions"],
};

interface Action {
  kind: RecommendationKind;
  title: string;
  summary: string;
  draft: string;
  confidence: number;
}

export async function runCoachingForClient(
  clientId: string,
  nowISO: string,
): Promise<Recommendation[] | null> {
  const ctx = await assembleClientContext(clientId, nowISO);
  if (!ctx) return null;

  const result = await generate<{ actions: Action[] }>({
    system: SYSTEM,
    user: `${ctx.brief}\n\nPropose this week's coaching actions for ${ctx.client.name}.`,
    schema: SCHEMA,
    effort: "medium",
    maxTokens: 5000,
  });
  if (!result?.actions?.length) return null;

  const out: Recommendation[] = [];
  for (const a of result.actions.slice(0, 4)) {
    const kind = KINDS.includes(a.kind) ? a.kind : "Client Message";
    out.push(
      await notion.createRecommendation({
        title: a.title?.trim() || `${kind} — ${ctx.client.name}`,
        kind,
        source: "Coaching Advisor",
        riskTier: "review",
        summary: a.summary ?? "",
        draft: a.draft ?? "",
        confidence: typeof a.confidence === "number" ? a.confidence : undefined,
        clientId,
        dedupKey: `coaching:${clientId}:${ctx.asOf}:${kind}`,
      }),
    );
  }
  return out;
}
