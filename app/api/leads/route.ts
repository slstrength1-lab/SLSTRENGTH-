import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/leads — list the sales pipeline.
export async function GET() {
  const data = await notion.getLeads();
  return NextResponse.json({ data });
}
