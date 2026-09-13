import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintifyLinkRow } from "@/components/admin/PrintifyLinkRow";
import { PrintifyImportRow } from "@/components/admin/PrintifyImportRow";
import { PrintifySyncButton } from "@/components/admin/PrintifySyncButton";
import { isPrintifyConfigured, listPrintifyProducts, type PrintifyProduct } from "@/lib/printify";
import { ArrowLeft, AlertCircle, Link2, Download } from "lucide-react";

export default async function PrintifyCatalogPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name_en, name_fa, sku, status, product_type, printify_product_id, printify_synced_at, product_variants(id, printify_variant_id)")
    .order("created_at", { ascending: false });

  const localProducts = products ?? [];

  let printifyProducts: PrintifyProduct[] = [];
  let printifyError: string | null = null;
  const configured = isPrintifyConfigured();

  if (configured) {
    try {
      printifyProducts = await listPrintifyProducts();
    } catch (err) {
      printifyError = err instanceof Error ? err.message : "Could not reach Printify.";
    }
  }

  const linkedCount = localProducts.filter((p) => p.printify_product_id).length;
  const linkedPrintifyIds = new Set(localProducts.map((p) => p.printify_product_id).filter(Boolean));
  const unimportedPrintifyProducts = printifyProducts.filter((p) => !linkedPrintifyIds.has(p.id));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Products
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Printify catalog</h1>
            <p className="text-sm text-slate-400">
              Import products you&apos;ve added on Printify, or link existing ones, so paid orders fulfill
              automatically.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="border-white/20 text-slate-300">
            {linkedCount} of {localProducts.length} linked
          </Badge>
          {configured && <PrintifySyncButton />}
        </div>
      </div>

      {!configured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Printify isn&apos;t connected</p>
            <p className="mt-1 text-amber-200/80">
              Set <code className="font-mono text-xs">PRINTIFY_API_TOKEN</code> and{" "}
              <code className="font-mono text-xs">PRINTIFY_SHOP_ID</code> in your environment, then reload this
              page. Until then products can&apos;t be linked and paid orders will be recorded but not sent to
              production.
            </p>
          </div>
        </div>
      )}

      {printifyError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load your Printify products</p>
            <p className="mt-1 text-red-200/80">{printifyError}</p>
          </div>
        </div>
      )}

      {configured && !printifyError && printifyProducts.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">
          Your Printify shop has no products yet. Create them in Printify first, then come back to link them.
        </div>
      )}

      {configured && !printifyError && unimportedPrintifyProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              New on Printify — not in your store yet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {unimportedPrintifyProducts.map((p) => (
                <PrintifyImportRow
                  key={p.id}
                  printifyProduct={{
                    id: p.id,
                    title: p.title,
                    variantCount: (p.variants ?? []).filter((v) => v.is_enabled).length,
                  }}
                  disabled={!configured || Boolean(printifyError)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Product mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {localProducts.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">
              No products yet.{" "}
              <Link href="/admin/products/new" className="text-lapis-400 hover:underline">
                Create one
              </Link>{" "}
              before linking to Printify.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {localProducts.map((product) => (
                <PrintifyLinkRow
                  key={product.id}
                  product={{
                    id: product.id,
                    name_en: product.name_en,
                    sku: product.sku,
                    status: product.status,
                    printify_product_id: product.printify_product_id,
                    variantCount: (product.product_variants ?? []).filter(
                      (v: { printify_variant_id: number | null }) => v.printify_variant_id !== null
                    ).length,
                  }}
                  printifyProducts={printifyProducts.map((p) => ({
                    id: p.id,
                    title: p.title,
                    variantCount: (p.variants ?? []).filter((v) => v.is_enabled).length,
                  }))}
                  disabled={!configured || Boolean(printifyError)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
