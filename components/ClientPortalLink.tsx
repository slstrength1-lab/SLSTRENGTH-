"use client";

import { useState } from "react";
import { Link2, Copy, Check, Loader2 } from "lucide-react";

/**
 * Coach-only control: mint a magic login link for a client and copy it, so Shane
 * can send it directly (DM/text) without an email service configured. The link
 * lasts 30 minutes and starts a 30-day client session on first open.
 */
export function ClientPortalLink({ clientId }: { clientId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/portal/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setState("error");
        setMsg(json.error || "Failed");
        return;
      }
      setLink(json.link);
      setState("ready");
    } catch {
      setState("error");
      setMsg("Failed");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (state === "ready") {
    return (
      <div className="flex items-center gap-1">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-44 rounded-lg border border-white/10 bg-ink-950/60 px-2 py-1.5 text-[11px] text-zinc-300"
        />
        <button
          onClick={copy}
          title="Copy portal link"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-ink-900 text-zinc-400 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generate}
        disabled={state === "loading"}
        title="Generate a private login link for this client"
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-blood-500/40 hover:text-white disabled:opacity-60"
      >
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        Get portal link
      </button>
      {state === "error" && <span className="max-w-[180px] text-xs text-blood-400">{msg}</span>}
    </div>
  );
}
