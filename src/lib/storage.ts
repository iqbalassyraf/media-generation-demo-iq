import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
};

export const EXT_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXT).map(([m, e]) => [e, m]),
);

export function extForMime(mime: string): string {
  return MIME_EXT[mime] ?? "bin";
}

export function outputDir(jobId: string): string {
  const dir = path.join(DATA_DIR, "outputs", jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function refDir(): string {
  const dir = path.join(DATA_DIR, "refs");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function tmpDir(): string {
  const dir = path.join(DATA_DIR, "tmp");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Rejects anything that is not a plain filename, so routes cannot escape their folder. */
export function safeName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}

/** Parses a data URL like "data:image/png;base64,...". Returns null if malformed. */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: Buffer } | null {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], data: Buffer.from(m[2], "base64") };
}
