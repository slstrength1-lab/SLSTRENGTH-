import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/programs — list programs. Optional ?clientId= filter.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  let data = await notion.getPrograms();
  if (clientId) data = data.filter((p) => p.clientId === clientId);
  return NextResponse.json({ data });
}
