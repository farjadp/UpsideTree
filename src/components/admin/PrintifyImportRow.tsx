"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, Download, AlertCircle } from "lucide-react";

export function PrintifyImportRow({
  printifyProduct,
  disabled,
}: {
  printifyProduct: { id: string; title: string; variantCount: number };
  disabled: boolean;
}) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products/import-from-printify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printify_product_id: printifyProduct.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to import.");
        setIsBusy(false);
        return;
      }

      // Land the admin straight on the new product to price, translate,
      // and publish it — importing alone never makes it visible to
      // customers (it's created as 'draft').
      router.push(`/admin/products/${data.productId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import.");
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="font-medium text-white">{printifyProduct.title}</p>
        <p className="mt-1 text-xs text-slate-400">
          {printifyProduct.variantCount} variant{printifyProduct.variantCount === 1 ? "" : "s"} on Printify · not
          in your store yet
        </p>
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
      <Button
        size="sm"
        onClick={handleImport}
        disabled={disabled || isBusy}
        style={{ backgroundColor: "#1D4E89" }}
        className="shrink-0 gap-2 text-white"
      >
        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Import as new product
      </Button>
    </div>
  );
}
