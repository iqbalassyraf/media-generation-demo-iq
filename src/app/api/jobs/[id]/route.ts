import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { deleteJob, getJob } from "@/lib/db";
import { DATA_DIR } from "@/lib/db";
import { safeName } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const job = getJob((await params).id);
  return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!safeName(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!getJob(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteJob(id);
  fs.rmSync(path.join(DATA_DIR, "outputs", id), { recursive: true, force: true });
  for (const f of fs.readdirSync(path.join(DATA_DIR, "refs")).filter((f) => f.startsWith(`${id}-`))) {
    fs.rmSync(path.join(DATA_DIR, "refs", f), { force: true });
  }
  return NextResponse.json({ ok: true });
}
