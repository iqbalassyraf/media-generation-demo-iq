import { NextResponse } from "next/server";
import { WORKFLOWS } from "@/lib/workflows";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ workflows: WORKFLOWS });
}
