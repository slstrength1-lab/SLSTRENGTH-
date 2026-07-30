"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/Brand";

export const dynamic = "force-dynamic";

function PortalLoginForm() {
  const params = useSearchParams();
  const expired = params.get("error") === "expired";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand href="/portal-login" />
        </div>

        {state === "sent" ? (
          <div className="rounded-2xl border border-white/[0.06] bg-ink-900/60 p-6 text-center backdrop-blur">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
            <h1 className="text-sm font-semibold text-white">Check your email</h1>
            <p className="mt-2 text-xs text-zinc-400">
              If <span className="text-zinc-200">{email}</span> is on file, we sent a secure login
              link. It expires in 30 minutes.
            </p>
            <p className="mt-4 text-[11px] text-zinc-600">
              Didn&apos;t get it? Ask your coach to send you your access link directly.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/[0.06] bg-ink-900/60 p-6 backdrop-blur"
          >
            <div className="mb-1 text-sm font-semibold text-white">Client sign in</div>
            <p className="mb-5 text-xs text-zinc-500">
              Enter your email and we&apos;ll send you a secure link to your portal.
            </p>
            {expired && (
              <p className="mb-3 text-xs text-amber-400">That link expired — request a fresh one.</p>
            )}

            <label className="flex flex-col gap-1.5 text-[11px] font-medium text-zinc-500">
              Email
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 focus-within:border-blood-500/40">
                <Mail className="h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  placeholder="you@email.com"
                  className="w-full bg-transparent py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
            </label>

            {state === "error" && (
              <p className="mt-2 text-xs text-blood-400">Something went wrong. Try again.</p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blood-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60"
            >
              {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {state === "sending" ? "Sending…" : "Send my login link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-[11px] text-zinc-600">
          SL Strength — client portal.
        </p>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PortalLoginForm />
    </Suspense>
  );
}
