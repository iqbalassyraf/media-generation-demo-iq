import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Brand, Job } from "./types";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

const g = globalThis as unknown as { __mediaDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "app.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  // In-flight jobs die with the process; mark them so the UI doesn't spin forever.
  for (const row of db.prepare("SELECT id, data FROM jobs WHERE data LIKE '%\"status\":\"running\"%' OR data LIKE '%\"status\":\"queued\"%'").all() as { id: string; data: string }[]) {
    const job = JSON.parse(row.data) as Job;
    job.status = "failed";
    job.error = "Interrupted by server restart";
    job.updatedAt = Date.now();
    db.prepare("UPDATE jobs SET data = ? WHERE id = ?").run(JSON.stringify(job), row.id);
  }
  return db;
}

export const db: DatabaseSync = g.__mediaDb ?? (g.__mediaDb = open());

// ---- Brands ----

export function listBrands(): Brand[] {
  return (db.prepare("SELECT data FROM brands ORDER BY updated_at DESC").all() as { data: string }[]).map(
    (r) => JSON.parse(r.data) as Brand,
  );
}

export function getBrand(id: string): Brand | null {
  const row = db.prepare("SELECT data FROM brands WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Brand) : null;
}

export function saveBrand(brand: Brand): void {
  db.prepare(
    "INSERT INTO brands (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).run(brand.id, JSON.stringify(brand), brand.updatedAt);
}

export function deleteBrand(id: string): void {
  db.prepare("DELETE FROM brands WHERE id = ?").run(id);
}

// ---- Jobs ----

export function listJobs(limit = 50): Job[] {
  return (db.prepare("SELECT data FROM jobs ORDER BY created_at DESC LIMIT ?").all(limit) as { data: string }[]).map(
    (r) => JSON.parse(r.data) as Job,
  );
}

export function getJob(id: string): Job | null {
  const row = db.prepare("SELECT data FROM jobs WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Job) : null;
}

export function saveJob(job: Job): void {
  job.updatedAt = Date.now();
  db.prepare(
    "INSERT INTO jobs (id, data, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
  ).run(job.id, JSON.stringify(job), job.createdAt);
}

export function deleteJob(id: string): void {
  db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
}
