"use client";

import { useState } from "react";
import { Salad, Sparkles, Loader2, Copy, Check, AlertTriangle } from "lucide-react";

/**
 * Nutrition Plan generator (coach → client). Enter the client's real stats, hit
 * Generate: targets are computed deterministically (always), then an AI meal
 * plan is designed and every food re-priced against the real nutrition database
 * (USDA / Open Food Facts / FatSecret). UI → /api/nutrition/{targets,plan}.
 */
const inputCls =
  "rounded-lg border border-white/[0.06] bg-ink-950/60 px-2 py-1.5 text-sm text-zinc-200 focus:border-blood-500/40 focus:outline-none focus:ring-1 focus:ring-blood-500/30";
const labelCls = "flex flex-col gap-1 text-[11px] uppercase tracking-wider text-zinc-500";

type Macro = { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number };
type Targets = Macro & { tdee: number; proteinPerKg: number; goal: string; weightKg: number };
type PlanFood = { name: string; amount: number; unit: string; grams: number; calories?: number; protein?: number; carbs?: number; fat?: number; unresolved?: boolean };
type PlanMeal = { name: string; foods: PlanFood[]; totals: Macro };
type Comparison = Record<"calories" | "protein" | "carbs" | "fat", { actual: number; target: number; pct: number }>;
type Plan = { meals: PlanMeal[]; dayTotals: Macro; comparison: Comparison; notes?: string; unresolved: string[] };

export function NutritionPlanner({ clientName }: { clientName: string }) {
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("30");
  const [ft, setFt] = useState("5");
  const [inch, setInch] = useState("10");
  const [weight, setWeight] = useState("185");
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal] = useState("lose");
  const [meals, setMeals] = useState("4");
  const [prefs, setPrefs] = useState("");
  const [avoid, setAvoid] = useState("");

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [targets, setTargets] = useState<Targets | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  function stats() {
    return {
      sex,
      age: Number(age) || 30,
      weight: Number(weight) || 0,
      weightUnit,
      height: (Number(ft) || 0) * 12 + (Number(inch) || 0),
      heightUnit: "in" as const,
      activity,
      goal,
    };
  }

  async function generate() {
    setState("loading");
    setMsg("");
    setPlan(null);
    setTargets(null);
    try {
      // 1) Targets — deterministic, always works (no keys needed).
      const tRes = await fetch("/api/nutrition/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stats()) });
      const tJson = await tRes.json();
      if (!tRes.ok || !tJson.ok) throw new Error(tJson.error || "Could not compute targets");
      setTargets(tJson.targets);

      // 2) AI meal plan — grounded in the nutrition DB (best effort).
      const pRes = await fetch("/api/nutrition/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: stats(), mealsPerDay: Number(meals) || 4, preferences: prefs || undefined, avoid: avoid || undefined, clientName }),
      });
      const pJson = await pRes.json();
      if (pJson.ok) setPlan(pJson);
      else setMsg(pJson.error || "Meal plan unavailable — targets are ready above.");
      setState("done");
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }

  function planText(): string {
    if (!targets) return "";
    const L: string[] = [`${clientName} — Nutrition Plan`, `Daily targets: ${targets.calories} kcal · ${targets.protein}g protein · ${targets.carbs}g carbs · ${targets.fat}g fat · ~${targets.fiber}g fiber`, ""];
    plan?.meals.forEach((m) => {
      L.push(`${m.name} — ${m.totals.calories ?? 0} kcal · ${m.totals.protein ?? 0}P/${m.totals.carbs ?? 0}C/${m.totals.fat ?? 0}F`);
      m.foods.forEach((f) => L.push(`  • ${f.name} — ${f.amount} ${f.unit} (${f.grams} g)${f.unresolved ? " [check]" : ""}`));
      L.push("");
    });
    if (plan?.notes) L.push(`Notes: ${plan.notes}`);
    return L.join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(planText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const macroChip = (label: string, v?: number, unit = "g") => (
    <div className="rounded-lg border border-white/[0.06] bg-ink-900/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="text-lg font-semibold text-white">
        {v ?? "—"}
        <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        <Salad className="h-3.5 w-3.5 text-blood-500" /> Nutrition Plan
      </div>

      {/* Stats form */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <label className={labelCls}>Sex
          <select value={sex} onChange={(e) => setSex(e.target.value)} className={inputCls}><option value="male">Male</option><option value="female">Female</option></select>
        </label>
        <label className={labelCls}>Age<input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className={inputCls} /></label>
        <label className={labelCls}>Height
          <div className="flex gap-1">
            <input value={ft} onChange={(e) => setFt(e.target.value)} inputMode="numeric" className={`${inputCls} w-full`} placeholder="ft" />
            <input value={inch} onChange={(e) => setInch(e.target.value)} inputMode="numeric" className={`${inputCls} w-full`} placeholder="in" />
          </div>
        </label>
        <label className={labelCls}>Weight
          <div className="flex gap-1">
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={`${inputCls} w-full`} />
            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as "lb" | "kg")} className={inputCls}><option value="lb">lb</option><option value="kg">kg</option></select>
          </div>
        </label>
        <label className={labelCls}>Activity
          <select value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls}>
            <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="very">Very active</option><option value="athlete">Athlete</option>
          </select>
        </label>
        <label className={labelCls}>Goal
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls}>
            <option value="lose">Fat loss</option><option value="maintain">Maintain</option><option value="gain">Gain</option><option value="recomp">Recomp</option>
          </select>
        </label>
        <label className={labelCls}>Meals/day<input value={meals} onChange={(e) => setMeals(e.target.value)} inputMode="numeric" className={inputCls} /></label>
        <label className={`${labelCls} col-span-2 sm:col-span-2 lg:col-span-3`}>Preferences<input value={prefs} onChange={(e) => setPrefs(e.target.value)} placeholder="loves chicken, rice, eggs; quick to prep" className={inputCls} /></label>
        <label className={`${labelCls} col-span-2 sm:col-span-2 lg:col-span-2`}>Avoid<input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="dairy, shellfish" className={inputCls} /></label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={generate} disabled={state === "loading"} className="flex items-center gap-1.5 rounded-xl bg-blood-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blood-600 disabled:opacity-60">
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {state === "loading" ? "Building plan…" : "Generate Plan"}
        </button>
        {targets && (
          <button onClick={copy} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white">
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copy for client
          </button>
        )}
        {state === "error" && <span className="text-xs text-blood-400">{msg}</span>}
      </div>

      {/* Targets */}
      {targets && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-600">Daily targets · {targets.goal} · {targets.proteinPerKg} g/kg protein · TDEE {targets.tdee}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {macroChip("Calories", targets.calories, "kcal")}
            {macroChip("Protein", targets.protein)}
            {macroChip("Carbs", targets.carbs)}
            {macroChip("Fat", targets.fat)}
            {macroChip("Fiber", targets.fiber)}
          </div>
        </div>
      )}

      {/* Meal plan */}
      {plan && (
        <div className="mt-4 space-y-3">
          {plan.meals.map((m, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-ink-900/50 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white">{m.name}</span>
                <span className="text-xs text-zinc-500">{m.totals.calories ?? 0} kcal · {m.totals.protein ?? 0}P / {m.totals.carbs ?? 0}C / {m.totals.fat ?? 0}F</span>
              </div>
              <div className="space-y-1">
                {m.foods.map((f, j) => (
                  <div key={j} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-300">
                      {f.name} <span className="text-zinc-600">· {f.amount} {f.unit} ({f.grams} g)</span>
                      {f.unresolved && <span className="ml-1 text-amber-400" title="No database match — verify macros">⚠</span>}
                    </span>
                    <span className="whitespace-nowrap text-zinc-500">{f.calories ?? 0} kcal · {f.protein ?? 0}P</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Actual vs target */}
          <div className="rounded-xl border border-white/[0.06] bg-ink-950/50 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-600">Plan total vs target</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => {
                const c = plan.comparison[k];
                const good = c.pct >= 90 && c.pct <= 110;
                return (
                  <div key={k}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="capitalize text-zinc-400">{k}</span>
                      <span className={good ? "text-emerald-400" : "text-amber-400"}>{c.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full ${good ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(c.pct, 130)}%` }} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">{c.actual} / {c.target}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {plan.unresolved.length > 0 && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-400/90">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {plan.unresolved.length} food{plan.unresolved.length === 1 ? "" : "s"} had no database match (macros estimated as 0) — add the free USDA key for sharper whole-food matching, or swap them.
            </p>
          )}
          {plan.notes && <p className="text-xs text-zinc-500">{plan.notes}</p>}
        </div>
      )}

      {/* Targets-only fallback note (AI/providers unavailable) */}
      {targets && !plan && state === "done" && (
        <p className="mt-3 text-[11px] text-zinc-500">Targets are ready. Full meal plan needs the AI layer + a nutrition provider online{msg ? ` — ${msg}` : ""}.</p>
      )}
    </div>
  );
}
