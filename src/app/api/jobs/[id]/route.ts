import { NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const job = getJob((await params).id);
  return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
