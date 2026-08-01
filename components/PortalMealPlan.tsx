"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Salad, Loader2, Check, Scale } from "lucide-react";

/**
 * Client portal — the client's saved meal plan + one-tap re-plan after a weigh-in.
 * The client enters ONLY their new weight; everything else (height, age, activity,
 * goal, preferences) is remembered server-side. POST /api/portal/replan.
 */
type Targets = { calories: number; protein: number; carbs: number; fat: number; fiber?: number } | null;

export function PortalMealPlan({
  initialPlan,
  initialTargets,
  weightUnit = "lb",
  hasProfile,
}: {
  initialPlan?: string;
  initialTargets: Targets;
  weightUnit?: string;
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan || "");
  const [targets, setTargets] = useState<Targets>(initialTargets);
  const [weight, setWeight] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function replan() {
    if (!weight) return;
    setState("saving");
    setMsg("");
    try {
      const res = await fetch("/api/portal/replan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: Number(weight) }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not update plan");
      setPlan(json.mealPlanText || plan);
      setTargets(json.targets || targets);
      setState("done");
      setWeight("");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }

  const chip = (label: string, v?: number, unit = "g") => (
    <div className="rounded-lg border border-white/[0.06] bg-ink-900/60 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="text-base font-semibold text-white">
        {v ?? "—"}
        <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Salad className="h-4 w-4 text-blood-500" /> My Meal Plan
      </div>

      {targets && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {chip("Calories", targets.calories, "kcal")}
          {chip("Protein", targets.protein)}
          {chip("Carbs", targets.carbs)}
          {chip("Fat", targets.fat)}
          {chip("Fiber", targets.fiber)}
        </div>
      )}

      {plan ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.05] bg-ink-950/50 p-4 text-xs leading-relaxed text-zinc-300">
          {plan}
        </pre>
      ) : (
        <p className="text-sm text-zinc-500">Your coach is setting up your first plan — it&apos;ll appear here.</p>
      )}

      {hasProfile && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-ink-950/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Scale className="h-4 w-4 text-blood-500" /> Weighed in? Update your plan
          </div>
          <p className="mb-2 text-[11px] text-zinc-500">Enter your new weight — that&apos;s all. We remember everything else and rebuild your macros + meals.</p>
          <div className="flex items-center gap-2">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder={`New weight (${weightUnit})`}
              className="w-40 rounded-lg border border-white/[0.06] bg-ink-950/60 px-3 py-2 text-sm text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30"
            />
            <button onClick={replan} disabled={state === "saving" || !weight} className="flex items-center gap-1.5 rounded-xl bg-blood-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60">
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "done" ? <Check className="h-4 w-4" /> : <Salad className="h-4 w-4" />}
              {state === "saving" ? "Updating…" : state === "done" ? "Updated" : "Update my plan"}
            </button>
          </div>
          {state === "error" && <p className="mt-2 text-xs text-blood-400">{msg}</p>}
        </div>
      )}
    </div>
  );
}
