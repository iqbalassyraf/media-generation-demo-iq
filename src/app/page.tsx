"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Brand, InputDef, Job, WorkflowDef } from "@/lib/types";

const TERMINAL = new Set(["succeeded", "failed"]);

export default function StudioPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([]);
  const [brandId, setBrandId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = () => {
      setHasApiKey(Boolean(localStorage.getItem("gemini_api_key")?.trim()));
    };
    checkKey();
    window.addEventListener("apiKeyChanged", checkKey);
    return () => window.removeEventListener("apiKeyChanged", checkKey);
  }, []);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => {
      setBrands(d.brands);
      setBrandId((cur) => cur || d.brands[0]?.id || "");
    });
    fetch("/api/workflows").then((r) => r.json()).then((d) => {
      setWorkflows(d.workflows);
      setWorkflowId((cur) => cur || d.workflows[0]?.id || "");
    });
  }, []);

  const workflow = useMemo(() => workflows.find((w) => w.id === workflowId), [workflows, workflowId]);

  // Poll the running job until it reaches a terminal state.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!job || TERMINAL.has(job.status)) return;
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/jobs/${job.id}`);
      if (!r.ok) return;
      const { job: next } = (await r.json()) as { job: Job };
      setJob(next);
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setJob(null);
    try {
      const storedKey = typeof window !== "undefined" ? localStorage.getItem("gemini_api_key")?.trim() || "" : "";
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedKey ? { "x-gemini-api-key": storedKey } : {}),
        },
        body: JSON.stringify({ brandId, workflowId, inputs: values, apiKey: storedKey }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Could not start job");
      setJob(body.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function readFile(key: string, file: File | undefined) {
    if (!file) return setValues((v) => ({ ...v, [key]: "" }));
    if (file.size > 8 * 1024 * 1024) return setError("Image must be under 8 MB");
    const dataUrl = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(file);
    });
    setValues((v) => ({ ...v, [key]: dataUrl }));
  }

  const brand = brands.find((b) => b.id === brandId);
  const running = submitting || (job !== null && !TERMINAL.has(job.status));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <form onSubmit={submit} className="space-y-5">
        <h1 className="font-serif text-2xl text-[var(--brand)]">Create</h1>

        <Field label="Brand">
          <select className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {brand && (
            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
              {brand.colors.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />)}
              <span className="truncate">{brand.tagline}</span>
            </div>
          )}
        </Field>

        <Field label="Workflow">
          <select className="input" value={workflowId} onChange={(e) => { setWorkflowId(e.target.value); setValues({}); }}>
            {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {workflow && <p className="mt-1 text-xs opacity-70">{workflow.description}</p>}
        </Field>

        {workflow?.inputs.map((def) => (
          <InputField key={def.key} def={def} value={values[def.key] ?? ""}
            onChange={(v) => setValues((cur) => ({ ...cur, [def.key]: v }))}
            onFile={(f) => readFile(def.key, f)} />
        ))}

        {error && <p className="rounded bg-red-100 p-3 text-sm text-red-800">{error}</p>}

        <div className="rounded border border-black/10 bg-black/[0.02] p-3 text-xs">
          {hasApiKey ? (
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span><strong>BYOK Active:</strong> Generating with your personal Gemini API key.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-black/60">
              <span className="h-2 w-2 rounded-full bg-black/30" />
              <span><strong>Mock Mode:</strong> Placeholder SVGs. Click <em>Set API Key (BYOK)</em> in top bar for real media.</span>
            </div>
          )}
        </div>

        <button disabled={running || !brandId || !workflowId}
          className="rounded bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {running ? "Generating…" : "Generate"}
        </button>
      </form>

      <section className="space-y-5">
        <h2 className="font-serif text-2xl text-[var(--brand)]">Result</h2>
        {!job && <p className="text-sm opacity-60">Run a workflow to see progress and outputs here.</p>}
        {job && <JobView job={job} />}
      </section>
    </div>
  );
}

function InputField({ def, value, onChange, onFile }: {
  def: InputDef; value: string; onChange: (v: string) => void; onFile: (f: File | undefined) => void;
}) {
  return (
    <Field label={def.label + (def.required ? " *" : "")}>
      {def.type === "textarea" && (
        <textarea className="input min-h-24" required={def.required} placeholder={def.placeholder}
          value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {def.type === "text" && (
        <input className="input" required={def.required} placeholder={def.placeholder}
          value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {def.type === "select" && (
        <select className="input" value={value || def.options?.[0]} onChange={(e) => onChange(e.target.value)}>
          {def.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
      {def.type === "image" && (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
          {value && <img src={value} alt="" className="max-h-32 rounded border border-black/10" />}
        </div>
      )}
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div>{children}</div>
    </label>
  );
}

function JobView({ job }: { job: Job }) {
  return (
    <div className="space-y-5">
      <div className="rounded border border-black/10 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">{job.workflowName}</span>
          <StatusBadge status={job.status} />
        </div>
        <ol className="mt-3 space-y-2 text-sm">
          {job.steps.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: stepColor(s.status) }} />
              <div>
                <div>{s.label} <span className="opacity-60">· {s.status}</span></div>
                {s.error && <div className="text-red-700">{s.error}</div>}
              </div>
            </li>
          ))}
        </ol>
        {job.error && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-800">{job.error}</p>}
        <details className="mt-3 text-xs opacity-70">
          <summary className="cursor-pointer">Prompts sent</summary>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {job.steps.map((s) => <li key={s.id}>{s.prompt}</li>)}
          </ul>
        </details>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {job.outputs.map((o) => (
          <figure key={o.url} className="space-y-1">
            {o.mimeType.startsWith("video/")
              ? <video src={o.url} controls className="w-full rounded" />
              : <img src={o.url} alt={o.label} className="w-full rounded border border-black/10" />}
            <figcaption className="flex items-center justify-between text-xs opacity-70">
              <span>{o.label}{o.mock && " · mock"}</span>
              <a href={o.url} download className="underline">Download</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const cls = { queued: "bg-gray-200", running: "bg-amber-200", succeeded: "bg-emerald-200", failed: "bg-red-200" }[status];
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function stepColor(s: string) {
  return { pending: "#9ca3af", running: "#e8b04b", succeeded: "#10b981", failed: "#ef4444" }[s] ?? "#9ca3af";
}
