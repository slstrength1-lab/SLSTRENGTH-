"use client";

import { useState } from "react";
import { NotebookPen, Plus, Pencil, Check, X, Loader2 } from "lucide-react";
import type { CoachNote, NoteType, NoteStatus, NotePriority } from "@/lib/types";
import { Pill } from "./primitives";

/**
 * Coach Notes — the client's running coaching log, persisted to the Notion
 * Coach Notes database via /api/coach-notes.
 *
 * Create (body + type + priority), update status, edit the body, and archive
 * (a soft status change that preserves history). Notes are structured so a
 * future AI layer can read the history and write recommendations back as notes
 * with Type = "AI Recommendation" — no AI generation happens here.
 */

const NOTE_TYPES: NoteType[] = [
  "Coaching Note",
  "Programming Decision",
  "Nutrition Decision",
  "Athlete Concern",
  "Follow-up",
  "AI Recommendation",
];
const NOTE_STATUSES: NoteStatus[] = ["New", "In Progress", "Actioned", "Archived"];
const NOTE_PRIORITIES: NotePriority[] = ["Low", "Medium", "High"];

const typeStyle: Record<NoteType, string> = {
  "Coaching Note": "bg-white/5 text-zinc-300 ring-white/10",
  "Programming Decision": "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  "Nutrition Decision": "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  "Athlete Concern": "bg-blood-500/15 text-blood-400 ring-blood-500/30",
  "Follow-up": "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  "AI Recommendation": "bg-violet-500/15 text-violet-400 ring-violet-500/25",
};
const statusStyle: Record<NoteStatus, string> = {
  New: "bg-sky-500/15 text-sky-400 ring-sky-500/25",
  "In Progress": "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  Actioned: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  Archived: "bg-white/5 text-zinc-500 ring-white/10",
};
const priorityStyle: Record<NotePriority, string> = {
  Low: "bg-white/5 text-zinc-400 ring-white/10",
  Medium: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  High: "bg-blood-500/15 text-blood-400 ring-blood-500/30",
};

const inputCls =
  "rounded-lg border border-white/[0.06] bg-ink-950/60 px-2 py-1.5 text-xs text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function CoachNotes({
  clientId,
  leadId,
  author = "Shane Lanteigne",
  initialNotes = [],
}: {
  clientId?: string;
  leadId?: string;
  author?: string;
  initialNotes?: CoachNote[];
}) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<NoteType>("Coaching Note");
  const [draftPriority, setDraftPriority] = useState<NotePriority>("Medium");
  const [save, setSave] = useState<SaveState>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  async function createNote() {
    const body = draft.trim();
    if (!body || save === "saving") return;
    setSave("saving");
    try {
      const res = await fetch("/api/coach-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, leadId, author, body, type: draftType, priority: draftPriority }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "sync failed");
      setNotes((prev) => [json.data as CoachNote, ...prev]);
      setDraft("");
      setDraftType("Coaching Note");
      setDraftPriority("Medium");
      setSave("saved");
      setTimeout(() => setSave("idle"), 2500);
    } catch {
      setSave("error");
    }
  }

  async function patchNote(id: string, patch: Partial<Pick<CoachNote, "status" | "type" | "priority" | "body">>) {
    const before = notes;
    // optimistic
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    try {
      const res = await fetch(`/api/coach-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setNotes((prev) => prev.map((n) => (n.id === id ? (json.data as CoachNote) : n)));
    } catch {
      setNotes(before); // revert
    }
  }

  function startEdit(n: CoachNote) {
    setEditingId(n.id);
    setEditBody(n.body);
  }
  async function saveEdit(id: string) {
    const body = editBody.trim();
    setEditingId(null);
    if (body) await patchNote(id, { body });
  }

  return (
    <div>
      {/* Composer */}
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/60 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Log an observation, programming or nutrition decision, athlete concern, or follow-up…"
          className="w-full resize-none rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as NoteType)}
            className={inputCls}
            aria-label="Note type"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={draftPriority}
            onChange={(e) => setDraftPriority(e.target.value as NotePriority)}
            className={inputCls}
            aria-label="Priority"
          >
            {NOTE_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            {save === "saving" && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving to SL Strength OS…
              </span>
            )}
            {save === "saved" && <span className="text-[11px] text-emerald-400">Saved to SL Strength OS</span>}
            {save === "error" && <span className="text-[11px] text-blood-400">Unable to sync — retry</span>}
            <button
              onClick={createNote}
              disabled={!draft.trim() || save === "saving"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blood-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </button>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-zinc-600">Posting as {author}</div>
      </div>

      {/* Log */}
      <div className="mt-4">
        {notes.length ? (
          <ul className="space-y-2">
            {notes.map((n) => {
              const archived = n.status === "Archived";
              return (
                <li
                  key={n.id}
                  className={`rounded-xl bg-ink-850/60 p-3 ${archived ? "opacity-60" : ""}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Pill className={typeStyle[n.type]}>{n.type}</Pill>
                    {n.priority && <Pill className={priorityStyle[n.priority]}>{n.priority}</Pill>}
                    <Pill className={statusStyle[n.status]}>{n.status}</Pill>
                    <span className="ml-auto text-[11px] text-zinc-600">{fmtDate(n.created)}</span>
                  </div>

                  {editingId === n.id ? (
                    <div>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
                      />
                      <div className="mt-1.5 flex gap-2">
                        <button
                          onClick={() => saveEdit(n.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blood-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blood-600"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-zinc-200">{n.body}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
                    <span className="font-medium text-zinc-500">{n.author}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <select
                        value={n.status}
                        onChange={(e) => patchNote(n.id, { status: e.target.value as NoteStatus })}
                        className={inputCls}
                        aria-label="Update status"
                      >
                        {NOTE_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      {editingId !== n.id && (
                        <button
                          onClick={() => startEdit(n)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-zinc-400 transition-colors hover:text-white"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-white/10 py-8 text-center">
            <NotebookPen className="mb-2 h-5 w-5 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">No notes yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Your coaching log will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
