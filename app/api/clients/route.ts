import { NextResponse } from "next/server";
import { notion } from "@/lib/notion";

// GET /api/clients — list all clients.
export async function GET() {
  const data = await notion.getClients();
  return NextResponse.json({ data });
}
