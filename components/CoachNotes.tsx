"use client";

import { useState } from "react";
import { NotebookPen, Plus, Info } from "lucide-react";

/**
 * Coach Notes — UI shell for a future notes system.
 *
 * There is no Notion "Coach Notes" database yet, so nothing here is persisted:
 * notes live only in local component state for the current session and are
 * cleared on refresh. When a backend exists, wire `onAdd` to
 * `POST /api/clients/:id/notes` and hydrate `initialNotes` from Notion — the
 * markup below does not need to change.
 *
 * To make this real, add a Notion database:  Coach Notes
 *   • Client   (relation → Clients)
 *   • Note     (rich text)
 *   • Author   (text/person)
 *   • Date     (created time)
 */

type Note = { id: string; body: string; author: string; at: string };

export function CoachNotes({
  author = "Shane Lanteigne",
  initialNotes = [],
}: {
  author?: string;
  initialNotes?: Note[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [draft, setDraft] = useState("");

  const add = () => {
    const body = draft.trim();
    if (!body) return;
    setNotes((prev) => [
      { id: `note_${prev.length + 1}`, body, author, at: "Just now (this session)" },
      ...prev,
    ]);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Notes are not saved yet — there is no Coach Notes database in Notion.
          They stay only for this session. Ask to add the backend when you&apos;re ready.
        </span>
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Log an observation, adjustment rationale, or follow-up for this client…"
          className="w-full resize-none rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-600">Posting as {author}</span>
          <button
            onClick={add}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blood-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add note
          </button>
        </div>
      </div>

      {/* Previous notes */}
      <div className="mt-4">
        {notes.length ? (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-ink-850/60 p-3">
                <p className="text-sm text-zinc-200">{n.body}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
                  <span className="font-medium text-zinc-500">{n.author}</span>
                  <span>·</span>
                  <span>{n.at}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-white/10 py-8 text-center">
            <NotebookPen className="mb-2 h-5 w-5 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No notes yet</p>
            <p className="mt-1 text-xs text-zinc-500">Your coaching notes for this client will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
