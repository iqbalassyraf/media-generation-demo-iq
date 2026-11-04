"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";

export default function GalleryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  async function remove(id: string) {
    if (!confirm("Delete this run and its files?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setJobs((cur) => cur.filter((j) => j.id !== id));
  }

  useEffect(() => {
    const load = () => fetch("/api/jobs").then((r) => r.json()).then((d) => setJobs(d.jobs));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1B475D]">Gallery</h1>
      {jobs.length === 0 && <p className="text-sm opacity-60">Nothing generated yet.</p>}
      <div className="space-y-4">
        {jobs.map((j) => (
          <article key={j.id} className="rounded-2xl border border-[#1B475D]/15 bg-white/50 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-[#1B475D]">{j.workflowName} · {j.brand.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#1B475D]/60">{new Date(j.createdAt).toLocaleString()} · {j.status}</span>
                <button onClick={() => remove(j.id)} className="text-xs text-rose-700 hover:underline">Delete</button>
              </div>
            </div>
            {j.error && <p className="mt-2 text-sm text-red-700">{j.error}</p>}
            {j.outputs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4">
                {j.outputs.map((o) => (
                  <a key={o.url} href={o.url} target="_blank" rel="noreferrer" className="block w-44 overflow-hidden rounded-xl border border-[#1B475D]/15 bg-white/80 p-2 shadow-sm transition hover:shadow-md hover:border-[#1B475D]/30">
                    {o.mimeType.startsWith("video/")
                      ? <video src={o.url} muted className="w-full rounded-lg" />
                      : <img src={o.url} alt={o.label} className="w-full rounded-lg border border-[#1B475D]/10" />}
                    <span className="mt-1.5 block truncate text-xs font-medium text-[#1B475D]/80">{o.label}{o.mock && " · mock"}</span>
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
