import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProductImages, getProductStock, normalizeProductStatus } from "@/lib/products";
import { createClient } from "@/utils/supabase/server";
import {
  AdminPagination,
  buildPageHref,
  isRangeNotSatisfiable,
  pageRange,
  parsePage,
} from "@/components/admin/AdminPagination";
import { PRODUCT_STATUS_FILTERS, PRODUCT_TYPE_FILTERS } from "./filters";
import { ProductsTable } from "./ProductsTable";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  const { q = "", status: statusParam = "", type: typeParam = "", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const { from, to } = pageRange(page);

  // PostgREST's or() filter is comma/paren-delimited; strip those so a
  // search term can't break out into its own filter clause.
  const term = q.trim().replace(/[,()*%]/g, " ").trim();
  const status = PRODUCT_STATUS_FILTERS.some((f) => f.value === statusParam) ? statusParam : "all";
  const type = PRODUCT_TYPE_FILTERS.some((f) => f.value === typeParam) ? typeParam : "all";
  const filterParams = {
    q: term || undefined,
    status: status !== "all" ? status : undefined,
    type: type !== "all" ? type : undefined,
  };

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      `
      *,
      collections ( name_en, name_fa )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (term) {
    const clauses = [
      `name_en.ilike.*${term}*`,
      `name_fa.ilike.*${term}*`,
      `sku.ilike.*${term}*`,
      `slug.ilike.*${term}*`,
    ];
    // Search used to match the collection name too; resolve matching
    // collections first so that keeps working server-side.
    const { data: matchingCollections } = await supabase
      .from("collections")
      .select("id")
      .or(`name_en.ilike.*${term}*,name_fa.ilike.*${term}*`)
      .limit(100);
    const collectionIds = (matchingCollections ?? []).map((c) => c.id).filter(Boolean);
    if (collectionIds.length > 0) {
      clauses.push(`collection_id.in.(${collectionIds.join(",")})`);
    }
    query = query.or(clauses.join(","));
  }

  // Statuses are normalized to lowercase with a "draft" default for display.
  if (status === "draft") {
    query = query.or("status.ilike.draft,status.is.null");
  } else if (status !== "all") {
    query = query.ilike("status", status);
  }

  // Products without a type display (and filter) as physical.
  if (type === "physical") {
    query = query.or("product_type.eq.physical,product_type.is.null");
  } else if (type !== "all") {
    query = query.eq("product_type", type);
  }

  const { data: products, error, count } = await query;

  if (page > 1 && isRangeNotSatisfiable(error)) {
    redirect(buildPageHref("/admin/products", filterParams, 1));
  }

  if (error) {
    console.error("Error fetching products:", error);
  }

  const total = count ?? 0;
  const hasFilters = Boolean(term) || status !== "all" || type !== "all";
  const hasDatabaseProducts = total > 0 || (hasFilters && !error);
  const displayProducts = products
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
            href="/admin/products/printify"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-sm font-medium transition-all"
          >
            Printify catalog
          </Link>
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

      <ProductsTable
        products={displayProducts}
        canDelete={hasDatabaseProducts}
        searchQuery={term}
        statusFilter={status}
        typeFilter={type}
      >
        <AdminPagination
          page={page}
          total={total}
          basePath="/admin/products"
          searchParams={filterParams}
          itemLabel="products"
        />
      </ProductsTable>
    </div>
  );
}
