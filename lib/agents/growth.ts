/**
 * A4 — Growth & Content Engine (Phase 4).
 *
 * Reads the business context + recent content and proposes a batch of content
 * ideas (and the occasional product idea) to fill the top of the funnel. Content
 * is published to an audience, so proposals are `review` tier — Shane approves
 * (and the draft caption is the deliverable he copies).
 */
import { assembleBusinessContext } from "./shared/context";
import { getContent } from "@/lib/store";
import { generate } from "./shared/llm";
import { notion } from "@/lib/notion";
import type { Recommendation, RecommendationKind } from "@/lib/types";

const SYSTEM = `You are the Growth & Content Engine for SL Strength, Shane Lanteigne's
premium online strength & nutrition coaching brand. Propose a batch of content
that grows the audience and drives coaching applications.

Return 3-6 ideas. Each is one of:
- "Content": a social post / reel / email idea. The "draft" is a ready-to-use
  hook + caption (and a one-line shot/format note).
- "Product": a digital product / lead-magnet idea. The "draft" is the concept,
  who it's for, and why it converts.

Cover a mix of content pillars (Education, Transformation, Behind the Scenes,
Promotion, Authority) and avoid repeating what's already scheduled. Write in
Shane's voice: authoritative, no fluff, results-driven. Ground ideas in the
business context; don't fabricate client results or testimonials.`;

const KINDS: RecommendationKind[] = ["Content", "Product"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
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
  required: ["ideas"],
};

interface Idea {
  kind: RecommendationKind;
  title: string;
  summary: string;
  draft: string;
  confidence: number;
}

export async function runGrowth(nowISO: string): Promise<Recommendation[] | null> {
  const ctx = await assembleBusinessContext(nowISO);
  const content = await getContent();
  const scheduled = content
    .slice(0, 12)
    .map((c) => `${c.pillar}: ${c.title} (${c.status})`)
    .join("; ");

  const result = await generate<{ ideas: Idea[] }>({
    system: SYSTEM,
    user: `${ctx.brief}\n\nAlready in the content pipeline: ${scheduled || "nothing scheduled"}.\n\nPropose this week's content (and any product ideas).`,
    schema: SCHEMA,
    effort: "medium",
    maxTokens: 5000,
  });
  if (!result?.ideas?.length) return null;

  const out: Recommendation[] = [];
  for (const [i, idea] of result.ideas.slice(0, 6).entries()) {
    const kind = KINDS.includes(idea.kind) ? idea.kind : "Content";
    out.push(
      await notion.createRecommendation({
        title: idea.title?.trim() || `${kind} idea`,
        kind,
        source: "Growth Engine",
        riskTier: "review",
        summary: idea.summary ?? "",
        draft: idea.draft ?? "",
        confidence: typeof idea.confidence === "number" ? idea.confidence : undefined,
        dedupKey: `growth:${ctx.asOf}:${i}`,
      }),
    );
  }
  return out;
}
