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
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#1B475D]/15 bg-white/50 p-6 shadow-sm backdrop-blur-sm">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1B475D]">Create</h1>

        <Field label="Brand">
          <select className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {brand && (
            <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
              {brand.colors.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-black/10 shadow-inner" style={{ background: c }} />)}
              <span className="truncate">{brand.tagline}</span>
            </div>
          )}
        </Field>

        <Field label="Workflow">
          <select className="input" value={workflowId} onChange={(e) => { setWorkflowId(e.target.value); setValues({}); }}>
            {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {workflow && <p className="mt-1 text-xs opacity-75">{workflow.description}</p>}
        </Field>

        {workflow?.inputs.map((def) => (
          <InputField key={def.key} def={def} value={values[def.key] ?? ""}
            onChange={(v) => setValues((cur) => ({ ...cur, [def.key]: v }))}
            onFile={(f) => readFile(def.key, f)} />
        ))}

        {error && <p className="rounded-lg bg-red-100/90 border border-red-200 p-3 text-sm text-red-900">{error}</p>}

        <div className="rounded-xl border border-[#1B475D]/15 bg-white/70 p-3 text-xs shadow-sm">
          {hasApiKey ? (
            <div className="flex items-center gap-2 text-[#1B475D] font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8EBD9D] shadow-[0_0_6px_rgba(142,189,157,0.9)]" />
              <span><strong>BYOK Active:</strong> Generating with your personal Gemini / Vertex AI key.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#1B475D]/80">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FAD564]" />
              <span><strong>Mock Mode:</strong> Placeholder SVGs. Click <em>Set API Key (BYOK)</em> in top bar for real media.</span>
            </div>
          )}
        </div>

        <button disabled={running || !brandId || !workflowId}
          className="rounded-lg bg-[#1B475D] px-6 py-2.5 text-sm font-semibold text-[#FFF5D0] shadow-sm hover:bg-[#1B475D]/90 disabled:opacity-50 transition">
          {running ? "Generating…" : "Generate"}
        </button>
      </form>

      <section className="space-y-5 rounded-2xl border border-[#1B475D]/15 bg-white/50 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1B475D]">Result</h2>
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
      <div className="rounded-xl border border-[#1B475D]/15 bg-white/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#1B475D]">{job.workflowName}</span>
          <StatusBadge status={job.status} />
        </div>
        <ol className="mt-3 space-y-2 text-sm">
          {job.steps.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: stepColor(s.status) }} />
              <div>
                <div className="font-medium text-[#1B475D]">{s.label} <span className="opacity-60 font-normal">· {s.status}</span></div>
                {s.error && <div className="text-red-700">{s.error}</div>}
              </div>
            </li>
          ))}
        </ol>
        {job.error && <p className="mt-3 rounded-lg bg-red-100/90 border border-red-200 p-2 text-sm text-red-900">{job.error}</p>}
        <details className="mt-3 text-xs text-[#1B475D]/70">
          <summary className="cursor-pointer hover:text-[#1B475D]">Prompts sent</summary>
          <ul className="mt-2 list-disc space-y-2 pl-5 font-mono text-[11px]">
            {job.steps.map((s) => <li key={s.id}>{s.prompt}</li>)}
          </ul>
        </details>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {job.outputs.map((o) => (
          <figure key={o.url} className="space-y-1.5 overflow-hidden rounded-xl border border-[#1B475D]/15 bg-white/70 p-2 shadow-sm">
            {o.mimeType.startsWith("video/")
              ? <video src={o.url} controls className="w-full rounded-lg" />
              : <img src={o.url} alt={o.label} className="w-full rounded-lg border border-[#1B475D]/10" />}
            <figcaption className="flex items-center justify-between px-1 text-xs text-[#1B475D]/80">
              <span className="font-medium">{o.label}{o.mock && " · mock"}</span>
              <a href={o.url} download className="font-medium text-[#1B475D] hover:text-[#8EBD9D] underline">Download</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const cls = {
    queued: "bg-[#FFF5D0] text-[#1B475D] border border-[#1B475D]/20",
    running: "bg-[#FAD564]/30 text-[#1B475D] border border-[#FAD564]",
    succeeded: "bg-[#8EBD9D]/30 text-[#1B475D] border border-[#8EBD9D]",
    failed: "bg-red-100 text-red-800 border border-red-200"
  }[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}

function stepColor(s: string) {
  return { pending: "#1B475D80", running: "#FAD564", succeeded: "#8EBD9D", failed: "#ef4444" }[s] ?? "#1B475D80";
}
