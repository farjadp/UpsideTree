"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type PrintifyOption = {
  id: string;
  title: string;
  variantCount: number;
};

export function PrintifyLinkRow({
  product,
  printifyProducts,
  disabled,
}: {
  product: {
    id: string;
    name_en: string | null;
    sku: string | null;
    status: string | null;
    printify_product_id: string | null;
    variantCount: number;
  };
  printifyProducts: PrintifyOption[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(product.printify_product_id ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const isLinked = Boolean(product.printify_product_id);
  const linkedTitle = printifyProducts.find((p) => p.id === product.printify_product_id)?.title;

  async function handleLink() {
    if (!selected) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/printify-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printify_product_id: selected }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({ kind: "error", text: data.error ?? "Failed to link." });
      } else {
        setFeedback({
          kind: "success",
          text: `Linked to "${data.printifyTitle}" — ${data.variantsImported} variant${
            data.variantsImported === 1 ? "" : "s"
          } imported${data.variantsSkipped ? `, ${data.variantsSkipped} disabled skipped` : ""}.`,
        });
        router.refresh();
      }
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Failed to link." });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUnlink() {
    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/printify-link`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({ kind: "error", text: data.error ?? "Failed to unlink." });
      } else {
        setSelected("");
        router.refresh();
      }
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Failed to unlink." });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{product.name_en ?? "Untitled"}</span>
            {isLinked ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Linked
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                Not linked
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {product.sku ? `SKU ${product.sku} · ` : ""}
            {product.status}
            {isLinked && (
              <>
                {" · "}
                {product.variantCount} variant{product.variantCount === 1 ? "" : "s"} mapped
              </>
            )}
          </p>
          {isLinked && (
            <p className="mt-1 text-xs text-slate-500">
              Printify: {linkedTitle ?? <span className="font-mono">{product.printify_product_id}</span>}
              {!linkedTitle && " (not found in this shop — it may have been deleted)"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={disabled || isBusy}
            className="h-9 min-w-[240px] rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 disabled:opacity-50"
          >
            <option value="">Select a Printify product…</option>
            {printifyProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.variantCount})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={handleLink}
            disabled={disabled || isBusy || !selected || selected === product.printify_product_id}
            style={{ backgroundColor: "#1D4E89" }}
            className="text-white"
          >
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isLinked ? "Re-sync" : "Link"}
          </Button>

          {isLinked && (
            <Button size="sm" variant="outline" onClick={handleUnlink} disabled={isBusy}>
              Unlink
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-md p-3 text-xs ${
            feedback.kind === "error"
              ? "border border-red-500/30 bg-red-500/10 text-red-200"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {feedback.kind === "error" ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
