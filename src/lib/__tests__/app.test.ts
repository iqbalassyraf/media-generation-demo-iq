import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolate storage and force the offline provider before any app module loads.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-studio-test-"));
process.env.DATA_DIR = dataDir;
process.env.MEDIA_PROVIDER = "mock";
process.env.VIDEO_POLL_MS = "1";

type Mods = typeof import("../engine") & typeof import("../db") & typeof import("../validate") & typeof import("../workflows") & typeof import("../seed");
let m: Mods;

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

before(async () => {
  const engine = await import("../engine");
  const db = await import("../db");
  const validate = await import("../validate");
  const workflows = await import("../workflows");
  const seed = await import("../seed");
  m = { ...engine, ...db, ...validate, ...workflows, ...seed } as Mods;
  m.ensureSeedBrand();
});

const brand = () => m.listBrands()[0];

test("renderPrompt fills brand and inputs and drops unknown placeholders", () => {
  const out = m.renderPrompt("Scene: {{subject}}. {{brand}} Extra: {{nope}}.", { subject: " a bag " }, "Brand: X.");
  assert.equal(out, "Scene: a bag. Brand: X. Extra: .");
});

test("brandBlock skips empty fields", () => {
  const block = m.brandBlock({ ...brand(), tagline: "", useWords: "", avoidWords: "", notes: "" });
  assert.ok(block.startsWith("Brand: Northwind Coffee."));
  assert.ok(!block.includes("Tagline"));
  assert.ok(block.includes("#1F3A2E"));
});

test("parseBrandBody validates name, colors and logo", () => {
  assert.throws(() => m.parseBrandBody({ id: "x", name: "  " }), /name is required/);
  assert.throws(() => m.parseBrandBody({ id: "x", name: "A", colors: ["red"] }), /Invalid color/);
  assert.throws(() => m.parseBrandBody({ id: "x", name: "A", logo: "data:text/plain;base64,AAAA" }), /Logo must be/);
  const ok = m.parseBrandBody({ id: "x", name: "A", colors: ["#00ff00"] });
  assert.deepEqual(ok.colors, ["#00ff00"]);
});

test("createJob rejects missing required input and invalid select", () => {
  assert.throws(() => m.createJob({ id: "j1", brand: brand(), workflowId: "social-set", inputs: {} }), /Core message is required/);
  assert.throws(
    () => m.createJob({ id: "j2", brand: brand(), workflowId: "hero-image", inputs: { subject: "x", mood: "Loud" } }),
    /invalid option/,
  );
});

test("createJob rejects non-image reference and writes no files on failure", () => {
  const refs = path.join(dataDir, "refs");
  fs.mkdirSync(refs, { recursive: true });
  const before = fs.readdirSync(refs).length;
  assert.throws(
    () => m.createJob({ id: "j3", brand: brand(), workflowId: "hero-image", inputs: { subject: "x", reference: "data:text/plain;base64,AAAA" } }),
    /not a valid image/,
  );
  assert.throws(
    () => m.createJob({ id: "j4", brand: brand(), workflowId: "hero-image", inputs: { subject: "", reference: PNG } }),
    /Subject|required/,
  );
  assert.equal(fs.readdirSync(refs).length, before);
});

test("runJob completes social-set with three outputs in mock mode", async () => {
  const job = m.createJob({ id: "social-1", brand: brand(), workflowId: "social-set", inputs: { message: "New single origin", cta: "Try it" } });
  m.saveJob(job);
  await m.runJob(job.id);
  const done = m.getJob(job.id)!;
  assert.equal(done.status, "succeeded");
  assert.equal(done.outputs.length, 3);
  assert.ok(done.outputs.every((o) => o.mock && o.mimeType === "image/svg+xml"));
  assert.ok(done.steps.every((s) => s.status === "succeeded"));
  assert.ok(fs.existsSync(path.join(dataDir, "outputs", "social-1", "feed-square-1.svg")));
});

test("runJob uses the reference image for hero-image and the video step", async () => {
  const hero = m.createJob({ id: "hero-1", brand: brand(), workflowId: "hero-image", inputs: { subject: "bag", mood: "Warm", reference: PNG } });
  m.saveJob(hero);
  await m.runJob(hero.id);
  assert.equal(m.getJob(hero.id)!.status, "succeeded");
  assert.equal(m.getJob(hero.id)!.outputs.length, 1);

  const video = m.createJob({ id: "vid-1", brand: brand(), workflowId: "product-video", inputs: { scene: "push-in", reference: PNG } });
  m.saveJob(video);
  await m.runJob(video.id);
  const v = m.getJob(video.id)!;
  assert.equal(v.status, "succeeded");
  assert.equal(v.outputs[0].stepId, "clip");
});

test("brand snapshot is kept on the job after the brand changes", async () => {
  const job = m.getJob("social-1")!;
  assert.equal(job.brand.name, "Northwind Coffee");
  m.saveBrand({ ...brand(), name: "Renamed" });
  assert.equal(m.getJob("social-1")!.brand.name, "Northwind Coffee");
  m.saveBrand({ ...brand(), name: "Northwind Coffee" });
});

test("deleteJob removes the record", () => {
  m.deleteJob("social-1");
  assert.equal(m.getJob("social-1"), null);
});

test("getProvider returns GeminiProvider when BYOK apiKey is provided", async () => {
  const { getProvider } = await import("../providers");
  const defaultProvider = getProvider();
  assert.equal(defaultProvider.name, "mock");

  const byokProvider = getProvider("fake-byok-api-key");
  assert.equal(byokProvider.name, "gemini");
  assert.equal(byokProvider.mock, false);
});
