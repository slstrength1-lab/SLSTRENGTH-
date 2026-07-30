"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Brand } from "@/components/Brand";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || state === "checking") return;
    setState("checking");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setState("error");
        setPassword("");
        return;
      }
      // Full navigation so middleware re-evaluates with the new cookie.
      window.location.href = from;
    } catch {
      setState("error");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand href="/login" />
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/[0.06] bg-ink-900/60 p-6 backdrop-blur"
        >
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
            <Lock className="h-4 w-4 text-blood-500" />
            Private access
          </div>

          <label className="flex flex-col gap-1.5 text-[11px] font-medium text-zinc-500">
            Password
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (state === "error") setState("idle");
              }}
              placeholder="Enter site password"
              className="w-full rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
            />
          </label>

          {state === "error" && (
            <p className="mt-2 text-xs text-blood-400">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            disabled={state === "checking"}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blood-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60"
          >
            {state === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {state === "checking" ? "Checking…" : "Enter"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-zinc-600">
          SL Strength OS — authorized access only.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
