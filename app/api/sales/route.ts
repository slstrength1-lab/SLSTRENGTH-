import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/sales — list sales / payments.
export async function GET() {
  const data = await notion.getSales();
  return NextResponse.json({ data });
}
