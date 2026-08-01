import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLIENT_COOKIE, verifyToken } from "@/lib/auth/session";
import { getClients } from "@/lib/store";
import { notion } from "@/lib/notion";
import { calcTargets, type ClientStats } from "@/lib/nutrition";
import { generateMealPlan } from "@/lib/agents/nutrition-planner";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/portal/replan — a logged-in client re-generates their own plan by
 * entering only their NEW weight. Everything else (sex/age/height/activity/goal/
 * preferences) is remembered from their saved Nutrition Profile. Client-auth only;
 * a client can update just themselves.
 * body: { weight: number }
 */
export async function POST(request: Request) {
  // Authenticate the client from their session (no coach fallback).
  const claims = await verifyToken(cookies().get(CLIENT_COOKIE)?.value);
  if (!claims) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  const clients = await getClients();
  const client: Client | undefined =
    clients.find((c) => c.id === claims.cid) ||
    clients.find((c) => c.email && c.email.toLowerCase() === claims.email.toLowerCase());
  if (!client) return NextResponse.json({ ok: false, error: "Client not found." }, { status: 404 });

  let body: { weight?: number } = {};
  try {
    body = (await request.json()) as { weight?: number };
  } catch {
    /* empty */
  }
  const newWeight = Number(body.weight);
  if (!newWeight || newWeight <= 0) return NextResponse.json({ ok: false, error: "Enter a valid weight." }, { status: 400 });

  // Load the saved profile — the whole point is not re-entering everything.
  let saved: Record<string, unknown> | null = null;
  try {
    saved = client.nutritionProfile ? (JSON.parse(client.nutritionProfile) as Record<string, unknown>) : null;
  } catch {
    saved = null;
  }
  if (!saved) {
    return NextResponse.json(
      { ok: false, error: "No saved plan yet — ask your coach to set up your first plan." },
      { status: 409 },
    );
  }

  const stats: ClientStats = {
    sex: (saved.sex as ClientStats["sex"]) ?? "male",
    age: Number(saved.age) || 30,
    weight: newWeight,
    weightUnit: (saved.weightUnit as "kg" | "lb") ?? "lb",
    height: (Number(saved.ft) || 0) * 12 + (Number(saved.inch) || 0),
    heightUnit: "in",
    activity: (saved.activity as ClientStats["activity"]) ?? "moderate",
    goal: (saved.goal as ClientStats["goal"]) ?? "maintain",
    bodyFatPct: Number(saved.bodyFatPct) || undefined,
  };

  const targets = calcTargets(stats);
  const mealsPerDay = Number(saved.meals) || 4;
  const plan = await generateMealPlan({ stats, mealsPerDay, preferences: (saved.prefs as string) || undefined, avoid: (saved.avoid as string) || undefined, clientName: client.name });

  // Serialize a client-readable plan text.
  const L: string[] = [`${client.name} — Nutrition Plan (updated ${new Date().toLocaleDateString()})`, `Daily targets: ${targets.calories} kcal · ${targets.protein}g protein · ${targets.carbs}g carbs · ${targets.fat}g fat`, ""];
  if (plan.ok) {
    for (const m of plan.meals) {
      L.push(`${m.name} — ${m.totals.calories ?? 0} kcal · ${m.totals.protein ?? 0}P/${m.totals.carbs ?? 0}C/${m.totals.fat ?? 0}F`);
      for (const f of m.foods) L.push(`  • ${f.name} — ${f.amount} ${f.unit} (${f.grams} g)`);
      L.push("");
    }
    if (plan.notes) L.push(`Notes: ${plan.notes}`);
  }
  const mealPlanText = L.join("\n");

  // Persist: updated weight + fresh targets in the profile, plus the new plan.
  const updatedProfile = { ...saved, weight: newWeight, targets, savedAt: new Date().toISOString() };
  await notion.updateClient(client.id, { nutritionProfile: JSON.stringify(updatedProfile), mealPlan: mealPlanText });

  return NextResponse.json({ ok: true, targets, mealPlanText, aiPlan: plan.ok });
}
