"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createGivingReport, deleteGivingReport, setGivingEnabled, setGivingReportPublished } from "./actions";

const inputClass =
  "w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500";

export function GivingSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    if (next && !window.confirm("Show the 3% giving commitment publicly on the storefront? Do this only after the legal review.")) {
      return;
    }
    setOn(next);
    setError("");
    startTransition(async () => {
      const result = await setGivingEnabled(next);
      if (result.error) {
        setOn(!next);
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`rounded-xl px-4 py-2 text-xs font-semibold ${on ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-950 text-slate-300 border border-white/10"} disabled:opacity-50`}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? "Public: ON" : "Public: OFF (hidden)"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function NewReportForm({ suggested }: { suggested: { start: string; end: string; collected: number } | null }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError("");
          const result = await createGivingReport(formData);
          if (result.error) setError(result.error);
        })
      }
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <label className="text-[11px] text-slate-400">
        Period start
        <input name="period_start" type="date" required defaultValue={suggested?.start} className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Period end
        <input name="period_end" type="date" required defaultValue={suggested?.end} className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Collected (CAD)
        <input name="collected_cad" type="number" step="0.01" min="0" defaultValue={suggested?.collected} className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Given (CAD)
        <input name="donated_cad" type="number" step="0.01" min="0" className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400 md:col-span-2">
        Recipient (charity / program)
        <input name="recipient" required className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Recipient website
        <input name="recipient_url" type="url" placeholder="https://" className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Proof (receipt / letter link)
        <input name="proof_url" type="url" placeholder="https://" className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        Notes (EN)
        <textarea name="notes_en" rows={3} className={inputClass} />
      </label>
      <label className="text-[11px] text-slate-400">
        یادداشت (فارسی)
        <textarea name="notes_fa" rows={3} dir="rtl" className={`${inputClass} font-persian`} />
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-gold-500/15 border border-gold-500/30 px-4 py-2 text-xs font-semibold text-gold-300 disabled:opacity-50">
          {pending ? "Saving…" : "Save report (unpublished)"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}

export function ReportActions({ id, published }: { id: string; published: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (action: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      setError("");
      const result = await action();
      if (result.error) setError(result.error);
    });

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setGivingReportPublished(id, !published))}
        className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-50"
      >
        {published ? "Unpublish" : "Publish"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this report?")) run(() => deleteGivingReport(id));
        }}
        className="rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] text-red-300 hover:text-red-200 disabled:opacity-50"
      >
        Delete
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
