"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

/**
 * Coach-side shortcut to the public lead application form. Copies the form URL
 * to the clipboard (with a brief "Copied!" confirmation) and offers a quick
 * open-in-new-tab. The URL is configurable via NEXT_PUBLIC_APPLICATION_FORM_URL
 * and falls back to the live SL Strength application form.
 */
const FORM_URL =
  process.env.NEXT_PUBLIC_APPLICATION_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSeYZML0pn7VL76YDYriiuuEosYS1dSX3Naz-rF9Zt5JGYAeYw/viewform";

export function CopyFormLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(FORM_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — fall back to opening it.
      window.open(FORM_URL, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={copy}
        title="Copy your public application form link"
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-blood-500/40 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy application link"}
      </button>
      <a
        href={FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Open application form"
        className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-ink-900 text-zinc-400 transition-colors hover:border-blood-500/40 hover:text-white"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
