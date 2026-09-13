"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

type SyncResult = {
  remoteCount?: number;
  imported?: unknown[];
  refreshed?: unknown[];
  errors?: string[];
  error?: string;
};

// Runs the full catalog mirror now: imports new Printify products and
// refreshes every linked one (variants, images, CAD prices and costs),
// instead of waiting for the scheduled sync.
export function PrintifySyncButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const run = async () => {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/printify/sync?force=1", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as SyncResult;
      if (!response.ok) throw new Error(data.error || "Sync failed");
      const errors = data.errors?.length ?? 0;
      setMessage(
        `Synced ${data.refreshed?.length ?? 0} products, imported ${data.imported?.length ?? 0}` +
          (errors ? ` — ${errors} error(s): ${data.errors!.slice(0, 2).join("; ")}` : ".")
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-gold-500/40 hover:text-gold-200 disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {running ? "Syncing…" : "Sync all from Printify"}
      </button>
      {message && <p className="max-w-md text-right text-[11px] text-slate-400">{message}</p>}
    </div>
  );
}
