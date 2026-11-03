import type { Brand } from "../types";

type BrandRef = Pick<Brand, "name" | "colors">;
import type { ImageRequest, MediaProvider, VideoStartRequest, VideoPoll } from "./types";

/**
 * Offline stand-in: renders a branded SVG card showing the brand colors and the
 * prompt that was sent. Lets the whole flow run with no credentials or quota.
 */
export class MockProvider implements MediaProvider {
  readonly name = "mock";
  readonly mock = true;
  private pending = new Map<string, { svg: Buffer }>();

  private render(label: string, width: number, height: number, prompt: string, brand?: BrandRef): Buffer {
    const [c1, c2, c3] = brand?.colors ?? ["#333333", "#999999", "#EEEEEE"];
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
    const lines = wrap(prompt, 60).slice(0, 8);
    const text = lines.map((l, i) => `<text x="40" y="${140 + i * 30}" font-size="22" fill="${c3}">${esc(l)}</text>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="40" y="70" font-size="34" font-weight="bold" fill="${c3}">${esc(brand?.name ?? "Brand")} · MOCK ${esc(label)}</text>
  ${text}
</svg>`;
    return Buffer.from(svg, "utf8");
  }

  async generateImage(req: ImageRequest) {
    const [w, h] = dims(req.aspectRatio);
    return { data: this.render(`IMAGE ${req.aspectRatio}`, w, h, req.prompt, req.brand), mimeType: "image/svg+xml" };
  }

  async startVideo(req: VideoStartRequest) {
    const operationName = `mock-${Math.random().toString(36).slice(2)}`;
    const [w, h] = dims(req.aspectRatio);
    this.pending.set(operationName, { svg: this.render(`VIDEO ${req.durationSeconds}s`, w, h, req.prompt, req.brand) });
    return { operationName };
  }

  async pollVideo(operationName: string): Promise<VideoPoll> {
    const entry = this.pending.get(operationName);
    if (!entry) return { done: true, error: "Unknown mock operation" };
    this.pending.delete(operationName);
    return { done: true, data: entry.svg, mimeType: "image/svg+xml" };
  }
}

function dims(a: string): [number, number] {
  switch (a) {
    case "1:1": return [800, 800];
    case "9:16": return [608, 1080];
    case "3:4": return [720, 960];
    case "4:3": return [960, 720];
    default: return [1280, 720];
  }
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      out.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) out.push(line);
  return out;
}
