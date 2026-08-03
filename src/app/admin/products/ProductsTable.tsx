"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { deleteProducts } from "./actions";

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
  low_stock_threshold?: number | null;
  price: number | string;
  status?: string | null;
  featured_image_url?: string | null;
  brand_gate?: Record<string, boolean> | null;
};

type ProductsTableProps = {
  products: ProductRow[];
  canDelete: boolean;
};

export function ProductsTable({ products, canDelete }: ProductsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        query.length === 0 ||
        [
          product.name_en,
          product.name_fa,
          product.sku,
          product.slug,
          product.collections?.name_en,
          product.collections?.name_fa,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" || (product.status || "draft") === statusFilter;

      const matchesType =
        typeFilter === "all" || (product.product_type || "physical") === typeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [products, searchQuery, statusFilter, typeFilter]);

  const filteredIds = filteredProducts.map((product) => product.id);
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
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, SKU, collection..."
              className="w-full pl-4 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="physical">Physical</option>
            <option value="pod">POD (Printful)</option>
            <option value="digital">Digital</option>
            <option value="limited">Limited Edition</option>
            <option value="variable">Variable</option>
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

      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
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
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    <p className="text-base font-medium text-slate-300">No products found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try changing your filters or add your first product to the catalog.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
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
                        <span
                          className={`font-medium ${
                            (product.stock_quantity ?? 0) <= (product.low_stock_threshold || 5)
                              ? "text-pomegranate-400"
                              : "text-slate-300"
                          }`}
                        >
                          {product.stock_quantity ?? 0} in stock
                        </span>
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
      </div>
    </>
  );
}
