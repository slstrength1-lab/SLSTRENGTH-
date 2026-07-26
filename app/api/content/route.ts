import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/content — list the content calendar.
export async function GET() {
  const data = await notion.getContent();
  return NextResponse.json({ data });
}
