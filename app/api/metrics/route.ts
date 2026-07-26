import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/metrics — weekly business scoreboard, newest first.
export async function GET() {
  const data = (await notion.getMetrics()).sort((a, b) =>
    a.weekOf < b.weekOf ? 1 : -1,
  );
  return NextResponse.json({ data });
}
