"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";

/**
 * Runs an AI advisor on demand (POST /api/agents/:name). On success the advisor
 * files a recommendation and the inbox refreshes to show it. Shows the reason
 * inline when the AI layer isn't configured or the run fails.
 */
export function RunAgentButton({
  agent = "briefing",
  label = "Generate briefing",
  body,
}: {
  agent?: string;
  label?: string;
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "created" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch(`/api/agents/${agent}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setState("error");
        setMsg(json.error || "Run failed");
        return;
      }
      // Show a confirmation, then give Notion a moment to index the new row(s)
      // before refreshing so the new card is present when the inbox re-renders.
      setState("created");
      setTimeout(() => {
        router.refresh();
        setState("idle");
      }, 2500);
    } catch {
      setState("error");
      setMsg("Run failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={state === "running" || state === "created"}
        className="flex items-center gap-1.5 rounded-xl bg-blood-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60"
      >
        {state === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "created" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {state === "running" ? "Thinking…" : state === "created" ? "Created ✓ refreshing…" : label}
      </button>
      {state === "error" && <span className="max-w-[220px] text-xs text-blood-400">{msg}</span>}
    </div>
  );
}
