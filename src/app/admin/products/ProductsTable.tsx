"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { deleteProducts } from "./actions";
import { PRODUCT_STATUS_FILTERS, PRODUCT_TYPE_FILTERS } from "./filters";

type ProductRow = {
  id: string;
  slug?: string | null;
  name_en: string;
  name_fa?: string | null;
  sku?: string | null;
  collections?: {
    name_en?: string | null;
    name_fa?: string | null;
  } | null;
  product_type?: string | null;
  stock_quantity?: number | null;
  manage_stock?: boolean | null;
  low_stock_threshold?: number | null;
  price: number | string;
  status?: string | null;
  featured_image_url?: string | null;
  brand_gate?: Record<string, boolean> | null;
};

type ProductsTableProps = {
  /** The current page of products, already filtered on the server. */
  products: ProductRow[];
  canDelete: boolean;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  /** Rendered under the table (pagination). */
  children?: ReactNode;
};

export function ProductsTable({
  products,
  canDelete,
  searchQuery,
  statusFilter,
  typeFilter,
  children,
}: ProductsTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const lastPushedQuery = useRef(searchQuery);

  // Filters live in the URL so the server can paginate the filtered set.
  // Any filter change goes back to page 1.
  const navigate = (next: { q?: string; status?: string; type?: string }) => {
    const q = (next.q ?? searchQuery).trim();
    const status = next.status ?? statusFilter;
    const type = next.type ?? typeFilter;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    const qs = params.toString();
    lastPushedQuery.current = q;
    startNavigation(() => {
      router.replace(qs ? `/admin/products?${qs}` : "/admin/products", { scroll: false });
    });
  };

  // Debounce typing into the search box.
  useEffect(() => {
    if (searchInput.trim() === lastPushedQuery.current) return;
    const timer = setTimeout(() => navigate({ q: searchInput }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const filteredIds = products.map((product) => product.id);
  const selectedCount = selectedIds.length;
  const allVisibleSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const toggleRow = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const handleDelete = (ids: string[]) => {
    if (!canDelete || ids.length === 0 || isPending) return;

    const confirmed = window.confirm(
      ids.length === 1
        ? "Delete this product? This action cannot be undone."
        : `Delete ${ids.length} selected products? This action cannot be undone.`
    );

    if (!confirmed) return;

    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteProducts(ids);

      if (result?.error) {
        setErrorMessage(result.error);
        return;
      }

      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, SKU, collection..."
              className="w-full pl-4 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) => navigate({ q: searchInput, status: event.target.value })}
            className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            {PRODUCT_STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => navigate({ q: searchInput, type: event.target.value })}
            className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            {PRODUCT_TYPE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleDelete(selectedIds)}
            disabled={!canDelete || selectedCount === 0 || isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-pomegranate-500/30 bg-pomegranate-500/10 text-pomegranate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pomegranate-500/20 transition-colors text-xs font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            {isPending ? "Deleting..." : `Delete Selected${selectedCount ? ` (${selectedCount})` : ""}`}
          </button>
        </div>
      </div>

      {!canDelete && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Bulk delete is only available for real products loaded from the database.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-pomegranate-500/20 bg-pomegranate-500/10 px-4 py-3 text-sm text-pomegranate-200">
          {errorMessage}
        </div>
      )}

      <div
        className={`rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl transition-opacity ${
          isNavigating ? "opacity-60" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
              <tr>
                <th className="px-4 py-4 w-12">
                  <input
                    type="checkbox"
                    aria-label="Select all visible products"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={filteredIds.length === 0}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950 text-lapis-500 focus:ring-lapis-500"
                  />
                </th>
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Collection</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Brand Gate</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    <p className="text-base font-medium text-slate-300">No products found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try changing your filters or add your first product to the catalog.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isGateComplete =
                    !!product.brand_gate && Object.values(product.brand_gate).every(Boolean);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-white/5 transition-colors group ${isSelected ? "bg-white/5" : ""}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name_en}`}
                          checked={isSelected}
                          onChange={() => toggleRow(product.id)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-950 text-lapis-500 focus:ring-lapis-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                          {product.featured_image_url ? (
                            <img
                              src={product.featured_image_url}
                              alt={product.name_en}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        <div>
                          {product.name_en}
                          {product.name_fa ? (
                            <span className="text-xs text-gold-400/80 ml-2 font-persian font-normal">
                              ({product.name_fa})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          SKU: {product.sku || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {product.collections?.name_en || "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono capitalize text-slate-400">
                        {product.product_type || "Physical"}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {/* Print-on-demand has no stock to count; showing "0 in
                            stock" in red suggested these were sold out. */}
                        {product.manage_stock === false ? (
                          <span className="font-medium text-emerald-400">Print on demand</span>
                        ) : (
                        <span
                          className={`font-medium ${
                            (product.stock_quantity ?? 0) <= (product.low_stock_threshold || 5)
                              ? "text-pomegranate-400"
                              : "text-slate-300"
                          }`}
                        >
                          {product.stock_quantity ?? 0} in stock
                        </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            product.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : product.status === "archived"
                                ? "bg-slate-500/10 text-slate-300 border border-slate-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {product.status || "draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isGateComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-2 rounded-lg bg-slate-950/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete([product.id])}
                            disabled={!canDelete || isPending}
                            className="p-2 rounded-lg bg-pomegranate-500/10 hover:bg-pomegranate-500/20 text-pomegranate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Delete ${product.name_en}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {children ? <div className="border-t border-white/10">{children}</div> : null}
      </div>
    </>
  );
}
