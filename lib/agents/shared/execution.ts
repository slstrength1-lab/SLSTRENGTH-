/**
 * Execution service — the ONLY place that applies an approved recommendation to
 * a real domain record. Agents never write domain tables directly; they emit
 * recommendations, a human approves, and this routes the approved row to the
 * right writer. This is the mechanism behind "no agent modifies another agent's
 * data" (see docs/ai-architecture-review.md §6).
 *
 * Phase 0 records approved actions in the Coach Notes log (the client's/lead's
 * running coaching history). Dedicated writers (full program builder, outbound
 * messaging, content scheduler) plug in per kind in later phases without
 * changing this interface.
 */
import { notion } from "@/lib/notion";
import type { Recommendation, NoteType } from "@/lib/types";

export interface ExecutionResult {
  applied: boolean;
  resultId?: string;
  detail: string;
}

const AUTHOR = "AI advisor (approved by coach)";

async function logNote(rec: Recommendation, type: NoteType): Promise<ExecutionResult> {
  const note = await notion.createCoachNote({
    clientId: rec.clientId,
    leadId: rec.leadId,
    type,
    body: rec.draft || rec.summary,
    status: "Actioned",
    author: AUTHOR,
  });
  return { applied: true, resultId: note.id, detail: `Logged to coaching history as “${type}”.` };
}

/** Apply an approved recommendation. Returns the created record id when one is made. */
export async function applyRecommendation(rec: Recommendation): Promise<ExecutionResult> {
  switch (rec.kind) {
    case "Client Message":
    case "Check-in Response":
      return logNote(rec, "Coaching Note");
    case "Sales Follow-up":
      return logNote(rec, "Follow-up");
    case "Program Update":
      return logNote(rec, "Programming Decision");
    case "Nutrition Update":
      return logNote(rec, "Nutrition Decision");
    case "Ops Task":
      return logNote(rec, "Follow-up");
    case "Content":
    case "Product":
    case "Briefing":
      // No dedicated domain writer yet — the approved draft in the ledger IS the
      // deliverable (the coach copies the caption / reads the brief). Later phases
      // add a content scheduler / product builder here.
      return { applied: true, detail: "Marked applied — draft retained in the ledger." };
    default:
      return { applied: true, detail: "Marked applied." };
  }
}
