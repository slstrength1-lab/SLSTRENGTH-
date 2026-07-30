"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Runs an AI advisor on demand (POST /api/agents/:name). On success the advisor
 * files a recommendation and the inbox refreshes to show it. Shows the reason
 * inline when the AI layer isn't configured or the run fails.
 */
export function RunAgentButton({
  agent = "briefing",
  label = "Generate briefing",
}: {
  agent?: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("running");
    setMsg("");
    try {
      const res = await fetch(`/api/agents/${agent}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setState("error");
        setMsg(json.error || "Run failed");
        return;
      }
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
      setMsg("Run failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={state === "running"}
        className="flex items-center gap-1.5 rounded-xl bg-blood-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60"
      >
        {state === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {state === "running" ? "Thinking…" : label}
      </button>
      {state === "error" && <span className="max-w-[220px] text-xs text-blood-400">{msg}</span>}
    </div>
  );
}
