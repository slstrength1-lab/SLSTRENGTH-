import { NextResponse } from "next/server";
import { notion, isLive } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/sales — list sales / payments. Optional ?clientId= filter.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  let data = await notion.getSales();
  if (clientId) data = data.filter((s) => s.clientId === clientId);
  return NextResponse.json({ data });
}

// POST /api/sales — log a payment (creates a Sales row linked to the client),
// or writes to sample memory when offline.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.clientId || typeof body?.amount !== "number") {
      return NextResponse.json(
        { ok: false, error: "clientId and numeric amount are required" },
        { status: 400 },
      );
    }
    const data = await notion.createSale(body);
    return NextResponse.json({ ok: true, mode: isLive ? "live" : "sample", data }, { status: 201 });
  } catch (err) {
    console.error("[api] POST /api/sales failed:", err);
    return NextResponse.json({ ok: false, error: "Unable to sync" }, { status: 500 });
  }
}
