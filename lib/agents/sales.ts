/**
 * A3 — Sales Assistant (Phase 3).
 *
 * Reads one lead's pipeline state and drafts the next sales move: a follow-up
 * message, discovery-call prep, or an offer nudge. Everything reaches a lead, so
 * proposals are `review` tier — Shane approves before anything is sent.
 */
import { assembleLeadContext } from "./shared/context";
import { generate } from "./shared/llm";
import { notion } from "@/lib/notion";
import type { Recommendation, RecommendationKind } from "@/lib/types";

const SYSTEM = `You are the Sales Assistant for SL Strength, a premium online coaching
business. Given one lead's pipeline state, propose the next best sales action.

Return 1-3 actions. Each is one of:
- "Sales Follow-up": a personalized outreach message to move the lead forward.
- "Client Message": prep notes for a discovery/consult call (talking points,
  questions, objections to expect).

Write the "draft" as ready-to-send text or ready-to-use notes. Be consultative,
not pushy — lead with value and the client's stated goal/problem. Ground
everything ONLY in the lead's data; never invent details. Respect the lead's
stage: earlier stages get rapport + qualification, later stages get the offer and
handling hesitation.`;

const KINDS: RecommendationKind[] = ["Sales Follow-up", "Client Message"];

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

export async function runSalesForLead(
  leadId: string,
  nowISO: string,
): Promise<Recommendation[] | null> {
  const ctx = await assembleLeadContext(leadId, nowISO);
  if (!ctx) return null;

  const result = await generate<{ actions: Action[] }>({
    system: SYSTEM,
    user: `${ctx.brief}\n\nPropose the next sales action(s) for ${ctx.lead.name}.`,
    schema: SCHEMA,
    effort: "medium",
    maxTokens: 4000,
  });
  if (!result?.actions?.length) return null;

  const out: Recommendation[] = [];
  for (const a of result.actions.slice(0, 3)) {
    const kind = KINDS.includes(a.kind) ? a.kind : "Sales Follow-up";
    out.push(
      await notion.createRecommendation({
        title: a.title?.trim() || `${kind} — ${ctx.lead.name}`,
        kind,
        source: "Sales Assistant",
        riskTier: "review",
        summary: a.summary ?? "",
        draft: a.draft ?? "",
        confidence: typeof a.confidence === "number" ? a.confidence : undefined,
        leadId,
        dedupKey: `sales:${leadId}:${ctx.asOf}:${kind}`,
      }),
    );
  }
  return out;
}
