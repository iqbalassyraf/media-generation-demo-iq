import { NextResponse } from "next/server";
import { getBrand, listJobs, saveJob } from "@/lib/db";
import { createJob, runJob } from "@/lib/engine";
import { ensureSeedBrand } from "@/lib/seed";
import { message } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ jobs: listJobs() });
}

export async function POST(req: Request) {
  ensureSeedBrand();
  try {
    const body = (await req.json()) as { brandId?: string; workflowId?: string; inputs?: Record<string, string> };
    const brand = body.brandId ? getBrand(body.brandId) : null;
    if (!brand) return NextResponse.json({ error: "Choose a brand" }, { status: 400 });

    const job = createJob({
      id: crypto.randomUUID(),
      brand,
      workflowId: body.workflowId ?? "",
      inputs: body.inputs ?? {},
    });
    saveJob(job);

    // Fire and forget: the client polls GET /api/jobs/:id for progress.
    void runJob(job.id).catch((err) => console.error("runJob crashed", err));

    return NextResponse.json({ job }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
