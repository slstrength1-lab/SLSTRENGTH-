import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/leads — list the sales pipeline.
export async function GET() {
  const data = await notion.getLeads();
  return NextResponse.json({ data });
}
