import { Plus } from "lucide-react";
import Link from "next/link";
import { getProductImages, getProductStock, normalizeProductStatus } from "@/lib/products";
import { createClient } from "@/utils/supabase/server";
import { ProductsTable } from "./ProductsTable";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      collections ( name_en, name_fa )
    `)
    .order("created_at", { ascending: false });

  const hasDatabaseProducts = !!products && products.length > 0;
  const displayProducts = hasDatabaseProducts
    ? products.map((product) => ({
        ...product,
        featured_image_url: product.featured_image_url || getProductImages(product)[0],
        stock_quantity: getProductStock(product),
        status: normalizeProductStatus(product.status),
      }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">
            Products Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage products, variants, inventory, and publishing status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/collections"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-sm font-medium transition-all"
          >
            + Add Collection
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-sm shadow-[0_4px_20px_rgba(29,78,137,0.4)] transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      <ProductsTable products={displayProducts} canDelete={hasDatabaseProducts} />
    </div>
  );
}
