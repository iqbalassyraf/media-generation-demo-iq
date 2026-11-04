"use client";

import { useEffect, useState } from "react";
import type { Brand } from "@/lib/types";

type Draft = Omit<Brand, "id" | "updatedAt"> & { id?: string };

const EMPTY: Draft = {
  name: "", tagline: "", colors: [], fonts: "", tone: "", useWords: "", avoidWords: "", notes: "", logo: null,
};

export default function BrandKitPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [colorsText, setColorsText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const d = await (await fetch("/api/brands")).json();
    setBrands(d.brands);
  }
  useEffect(() => { load(); }, []);

  function edit(b: Brand) {
    setDraft(b);
    setColorsText(b.colors.join(", "));
    setMessage(null);
  }

  function reset() {
    setDraft(EMPTY);
    setColorsText("");
    setMessage(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const body = { ...draft, colors: colorsText.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) };
    const url = draft.id ? `/api/brands/${draft.id}` : "/api/brands";
    const r = await fetch(url, {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) return setMessage({ kind: "err", text: data.error });
    setMessage({ kind: "ok", text: "Saved" });
    setDraft(data.brand);
    setColorsText(data.brand.colors.join(", "));
    load();
  }

  async function remove() {
    if (!draft.id || !confirm(`Delete ${draft.name}?`)) return;
    await fetch(`/api/brands/${draft.id}`, { method: "DELETE" });
    reset();
    load();
  }

  function onLogo(file: File | undefined) {
    if (!file) return setDraft({ ...draft, logo: null });
    if (file.size > 1024 * 1024) return setMessage({ kind: "err", text: "Logo must be under 1 MB" });
    const fr = new FileReader();
    fr.onload = () => setDraft((d) => ({ ...d, logo: String(fr.result) }));
    fr.readAsDataURL(file);
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border border-[#1B475D]/15 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1B475D]">Brand kit</h1>
        </div>
        <button onClick={reset} className="w-full rounded-lg border border-dashed border-[#1B475D]/30 bg-white/40 px-3 py-2 text-sm font-medium text-[#1B475D] hover:bg-white transition">+ New brand</button>
        <ul className="space-y-1">
          {brands.map((b) => (
            <li key={b.id}>
              <button onClick={() => edit(b)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${draft.id === b.id ? "bg-[#8EBD9D]/30 font-semibold text-[#1B475D]" : "hover:bg-white/60 text-[#1B475D]/80"}`}>
                {b.logo ? <img src={b.logo} alt="" className="h-6 w-6 rounded object-contain" /> : <span className="h-6 w-6 rounded bg-[#1B475D]/10" />}
                <span className="truncate">{b.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <form onSubmit={save} className="grid gap-5 md:grid-cols-2 rounded-2xl border border-[#1B475D]/15 bg-white/50 p-6 shadow-sm backdrop-blur-sm">
        <div className="md:col-span-2 flex items-center justify-between border-b border-[#1B475D]/10 pb-3">
          <h2 className="font-serif text-xl font-bold text-[#1B475D]">{draft.id ? "Edit brand" : "New brand"}</h2>
          <div className="flex items-center gap-3">
            {message && <span className={`text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{message.text}</span>}
            {draft.id && <button type="button" onClick={remove} className="text-sm text-red-700 hover:underline">Delete</button>}
          </div>
        </div>

        <Text label="Brand name *" value={draft.name} onChange={set("name")} required />
        <Text label="Tagline" value={draft.tagline} onChange={set("tagline")} />
        <div className="md:col-span-2">
          <Label text="Brand colors (hex, comma separated)">
            <input className="input" value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="#1B475D, #FAD564, #8EBD9D" />
          </Label>
          <div className="mt-2 flex gap-2">
            {colorsText.split(",").map((c) => c.trim()).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).map((c) => (
              <span key={c} className="h-6 w-6 rounded-full border border-black/10 shadow-inner" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
        <Text label="Typography feel" value={draft.fonts} onChange={set("fonts")} className="md:col-span-2" />
        <TextArea label="Tone of voice" value={draft.tone} onChange={set("tone")} className="md:col-span-2" />
        <Text label="Words that fit" value={draft.useWords} onChange={set("useWords")} />
        <Text label="Words to avoid" value={draft.avoidWords} onChange={set("avoidWords")} />
        <TextArea label="Product notes" value={draft.notes} onChange={set("notes")} className="md:col-span-2" />

        <Label text="Logo (optional, under 1 MB)" className="md:col-span-2">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} className="text-sm" />
            {draft.logo && <img src={draft.logo} alt="" className="h-12 rounded border border-[#1B475D]/15 object-contain" />}
          </div>
        </Label>

        <div className="md:col-span-2">
          <button className="rounded-lg bg-[#1B475D] px-6 py-2.5 text-sm font-semibold text-[#FFF5D0] shadow-sm hover:bg-[#1B475D]/90 transition">Save brand</button>
        </div>
      </form>
    </div>
  );
}

function Label({ text, children, className = "" }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium">{text}</span>
      <div>{children}</div>
    </label>
  );
}

function Text(props: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; required?: boolean; className?: string }) {
  return (
    <Label text={props.label} className={props.className}>
      <input className="input" value={props.value} onChange={props.onChange} required={props.required} />
    </Label>
  );
}

function TextArea(props: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement>; className?: string }) {
  return (
    <Label text={props.label} className={props.className}>
      <textarea className="input min-h-20" value={props.value} onChange={props.onChange} />
    </Label>
  );
}
