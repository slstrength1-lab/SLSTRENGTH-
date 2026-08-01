import { NextResponse } from "next/server";
import { calcTargets, type ClientStats } from "@/lib/nutrition";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/nutrition/targets — deterministic macro targets from client stats.
 * body: { sex, age, weight, weightUnit?, height, heightUnit?, activity, goal, ... }
 * Always works (no API key / no AI needed).
 */
export async function POST(request: Request) {
  try {
    const stats = (await request.json()) as ClientStats;
    if (!stats?.sex || !stats?.age || !stats?.weight || !stats?.height || !stats?.activity || !stats?.goal) {
      return NextResponse.json(
        { ok: false, error: "required: sex, age, weight, height, activity, goal", code: "validation" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, targets: calcTargets(stats) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message, code: "validation" }, { status: 400 });
  }
}
