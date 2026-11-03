"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";

export default function GalleryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const load = () => fetch("/api/jobs").then((r) => r.json()).then((d) => setJobs(d.jobs));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-[var(--brand)]">Gallery</h1>
      {jobs.length === 0 && <p className="text-sm opacity-60">Nothing generated yet.</p>}
      <div className="space-y-4">
        {jobs.map((j) => (
          <article key={j.id} className="rounded border border-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{j.workflowName} · {j.brand.name}</span>
              <span className="opacity-60">{new Date(j.createdAt).toLocaleString()} · {j.status}</span>
            </div>
            {j.error && <p className="mt-2 text-sm text-red-700">{j.error}</p>}
            {j.outputs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {j.outputs.map((o) => (
                  <a key={o.url} href={o.url} target="_blank" rel="noreferrer" className="block w-40">
                    {o.mimeType.startsWith("video/")
                      ? <video src={o.url} muted className="w-full rounded" />
                      : <img src={o.url} alt={o.label} className="w-full rounded border border-black/10" />}
                    <span className="text-xs opacity-70">{o.label}{o.mock && " · mock"}</span>
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
