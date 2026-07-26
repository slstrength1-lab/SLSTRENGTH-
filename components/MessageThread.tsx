"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Message } from "@/lib/types";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({ initial }: { initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local_${prev.length}`,
        from: "client",
        author: "You",
        body,
        timestamp: new Date().toISOString(),
        read: true,
      },
    ]);
    setDraft("");
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m) => {
          const mine = m.from === "client";
          return (
            <div key={m.id} className={`flex items-end gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  mine
                    ? "bg-ink-700 text-zinc-200"
                    : "bg-gradient-to-br from-blood-500 to-blood-700 text-white"
                }`}
              >
                {mine ? "You" : "SL"}
              </span>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "rounded-br-sm bg-blood-500 text-white"
                      : "rounded-bl-sm bg-ink-850 text-zinc-200"
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-1 px-1 text-[11px] text-zinc-600">
                  {mine ? "You" : "Shane"} · {timeLabel(m.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your coach…"
            className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blood-500/50 focus:ring-2 focus:ring-blood-500/20"
          />
          <button
            type="submit"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blood-500 text-white transition-colors hover:bg-blood-600"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
