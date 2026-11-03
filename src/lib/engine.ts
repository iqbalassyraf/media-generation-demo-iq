import fs from "node:fs";
import path from "node:path";
import { getJob, saveJob } from "./db";
import { getProvider } from "./providers";
import type { InlineImage } from "./providers/types";
import { getWorkflow } from "./workflows";
import { EXT_MIME, extForMime, outputDir, refDir, parseDataUrl } from "./storage";
import type { Brand, Job, Output, Step, StepDef } from "./types";

const POLL_INTERVAL_MS = Number(process.env.VIDEO_POLL_MS ?? 10_000);
const POLL_TIMEOUT_MS = Number(process.env.VIDEO_TIMEOUT_MS ?? 15 * 60_000);

/** Builds the brand block injected into every prompt. Empty fields are skipped. */
export function brandBlock(b: Brand): string {
  const parts = [
    `Brand: ${b.name}.`,
    b.tagline && `Tagline: "${b.tagline}".`,
    b.colors.length && `Brand colors: ${b.colors.join(", ")}. Use them as the dominant palette.`,
    b.fonts && `Typography feel: ${b.fonts}.`,
    b.tone && `Tone and mood: ${b.tone}`,
    b.useWords && `Words that fit the brand: ${b.useWords}.`,
    b.avoidWords && `Avoid these ideas or words: ${b.avoidWords}.`,
    b.notes && `Product notes: ${b.notes}`,
  ];
  return parts.filter(Boolean).join(" ");
}

/** Replaces {{brand}} and {{key}} placeholders. Unknown keys become empty strings. */
export function renderPrompt(template: string, inputs: Record<string, string>, brand: string): string {
  return template
    .replace(/\{\{brand\}\}/g, brand)
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => (inputs[key] ?? "").trim())
    .replace(/\s+/g, " ")
    .trim();
}

/** Creates a job record from a request. Image inputs arrive as data URLs and are written to disk here. */
export function createJob(args: {
  id: string;
  brand: Brand;
  workflowId: string;
  inputs: Record<string, string>;
}): Job {
  const wf = getWorkflow(args.workflowId);
  if (!wf) throw new Error(`Unknown workflow: ${args.workflowId}`);

  const inputs: Record<string, string> = {};
  const pendingRefs: Array<{ file: string; data: Buffer }> = [];
  for (const def of wf.inputs) {
    const raw = (args.inputs[def.key] ?? "").toString();
    if (def.type === "image") {
      if (!raw) continue;
      const parsed = parseDataUrl(raw);
      if (!parsed || !parsed.mimeType.startsWith("image/")) throw new Error(`${def.label}: not a valid image`);
      if (parsed.data.length > 8 * 1024 * 1024) throw new Error(`${def.label}: image is over 8 MB`);
      const file = `${args.id}-${def.key}.${extForMime(parsed.mimeType)}`;
      pendingRefs.push({ file, data: parsed.data });
      inputs[def.key] = `ref:${file}`;
      continue;
    }
    if (def.required && !raw.trim()) throw new Error(`${def.label} is required`);
    if (def.type === "select" && raw && def.options && !def.options.includes(raw)) {
      throw new Error(`${def.label}: invalid option`);
    }
    inputs[def.key] = raw;
  }

  for (const r of pendingRefs) fs.writeFileSync(path.join(refDir(), r.file), r.data);

  const now = Date.now();
  return {
    id: args.id,
    workflowId: wf.id,
    workflowName: wf.name,
    brandId: args.brand.id,
    brand: args.brand,
    inputs,
    status: "queued",
    steps: wf.steps.map((s) => ({
      id: s.id,
      label: s.label,
      type: s.type,
      aspectRatio: s.aspectRatio,
      status: "pending",
      prompt: renderPrompt(s.prompt, inputs, brandBlock(args.brand)),
    })),
    outputs: [],
    createdAt: now,
    updatedAt: now,
  };
}

function loadReference(job: Job, def: StepDef): InlineImage[] {
  if (!def.useReferenceImage) return [];
  const ref = job.inputs.reference;
  if (!ref?.startsWith("ref:")) return [];
  const file = path.join(refDir(), ref.slice(4));
  const mime = EXT_MIME[path.extname(file).slice(1)] ?? "image/png";
  return [{ mimeType: mime, data: fs.readFileSync(file) }];
}

function saveOutput(job: Job, step: Step, data: Buffer, mimeType: string, mock: boolean): Output {
  const dir = outputDir(job.id);
  const n = job.outputs.filter((o) => o.stepId === step.id).length + 1;
  const file = `${step.id}-${n}.${extForMime(mimeType)}`;
  fs.writeFileSync(path.join(dir, file), data);
  return {
    stepId: step.id,
    label: step.label,
    mimeType,
    url: `/api/files/${job.id}/${file}`,
    aspectRatio: step.aspectRatio,
    mock,
  };
}

/** Runs a job to completion. Called without await from the POST route; progress is written to SQLite. */
export async function runJob(jobId: string, apiKey?: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;
  const wf = getWorkflow(job.workflowId);
  if (!wf) return fail(job, "Workflow no longer exists");

  const provider = getProvider(apiKey);
  job.status = "running";
  saveJob(job);

  for (let i = 0; i < wf.steps.length; i++) {
    const def = wf.steps[i];
    const step = job.steps[i];
    step.status = "running";
    saveJob(job);

    try {
      if (def.type === "image") {
        const logo = def.useBrandLogo && job.brand.logo ? parseDataUrl(job.brand.logo) : null;
        const refs = [...loadReference(job, def), ...(logo ? [{ mimeType: logo.mimeType, data: logo.data }] : [])];
        const out = await provider.generateImage({
          prompt: step.prompt,
          aspectRatio: step.aspectRatio,
          referenceImages: refs,
          brand: { name: job.brand.name, colors: job.brand.colors },
        });
        job.outputs.push(saveOutput(job, step, out.data, out.mimeType, provider.mock));
      } else {
        if (step.aspectRatio !== "16:9" && step.aspectRatio !== "9:16") {
          throw new Error(`Video does not support ${step.aspectRatio}`);
        }
        const [starting] = loadReference(job, def);
        const { operationName } = await provider.startVideo({
          prompt: step.prompt,
          aspectRatio: step.aspectRatio,
          durationSeconds: def.durationSeconds ?? 6,
          startingImage: starting,
          brand: { name: job.brand.name, colors: job.brand.colors },
        });
        step.operationName = operationName;
        saveJob(job);

        const deadline = Date.now() + POLL_TIMEOUT_MS;
        for (;;) {
          await sleep(provider.mock ? 0 : POLL_INTERVAL_MS);
          const poll = await provider.pollVideo(operationName);
          if (poll.done) {
            if (poll.error || !poll.data) throw new Error(poll.error ?? "Video generation failed");
            job.outputs.push(saveOutput(job, step, poll.data, poll.mimeType ?? "video/mp4", provider.mock));
            break;
          }
          if (Date.now() > deadline) throw new Error("Video generation timed out");
        }
      }
      step.status = "succeeded";
      saveJob(job);
    } catch (err) {
      step.status = "failed";
      step.error = err instanceof Error ? err.message : String(err);
      return fail(job, step.error);
    }
  }

  job.status = "succeeded";
  saveJob(job);
}

function fail(job: Job, message: string) {
  job.status = "failed";
  job.error = message;
  saveJob(job);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
