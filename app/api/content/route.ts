import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

export const dynamic = "force-dynamic";

// GET /api/content — list the content calendar.
export async function GET() {
  const data = await notion.getContent();
  return NextResponse.json({ data });
}
