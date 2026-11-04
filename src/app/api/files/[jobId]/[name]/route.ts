import fs from "node:fs";
import path from "node:path";
import { outputDir, safeName, EXT_MIME } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string; name: string }> }) {
  const { jobId, name } = await params;
  if (!safeName(jobId) || !safeName(name)) return new Response("Not found", { status: 404 });
  const file = path.join(outputDir(jobId), name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = path.extname(name).slice(1);
  return new Response(fs.readFileSync(file), {
    headers: {
      "Content-Type": EXT_MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
