import { createClient } from "@/utils/supabase/server";
import { Plus, Search, Filter, Grid, List, MoreHorizontal, Edit, Trash2, Eye, Copy, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { getAllProducts } from "@/lib/mock/products";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      collections ( name_en, name_fa )
    `)
    .order("created_at", { ascending: false });

  const mockList = getAllProducts();
  const displayProducts = (products && products.length > 0)
    ? products
    : mockList.map((p) => ({
        id: p.id,
        slug: p.slug,
        name_en: p.nameEn,
        name_fa: p.nameFa,
        sku: p.sku || "N/A",
        collections: { name_en: p.collectionSlug.toUpperCase(), name_fa: "" },
        product_type: p.type || "physical",
        stock_quantity: p.stockCount || 50,
        price: p.price,
        status: "active",
        featured_image_url: p.images[0],
        brand_gate: {
          has_story: true,
          fits_collection: true,
          persian_reviewed: true,
          sample_approved: true,
          pricing_checked: true,
          legal_checked: true,
        },
      }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Products Catalog</h1>
          <p className="text-sm text-slate-400 mt-1">Manage products, variants, inventory, and publishing status.</p>
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

      {/* Filter & Toolbar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, SKU, tag..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select className="bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
            <option value="all">All Types</option>
            <option value="physical">Physical</option>
            <option value="pod">POD (Printful)</option>
            <option value="digital">Digital</option>
            <option value="limited">Limited Edition</option>
            <option value="variable">Variable</option>
          </select>
        </div>
      </div>

      {/* Products Table (List View) */}
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
              <tr>
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
              {!displayProducts || displayProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <p className="text-base font-medium text-slate-300">No products found</p>
                    <p className="text-xs text-slate-500 mt-1">Start by adding your first product to the catalog.</p>
                  </td>
                </tr>
              ) : (
                displayProducts.map((product) => {
                  const isGateComplete = product.brand_gate && Object.values(product.brand_gate).every(Boolean);
                  return (
                    <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                          {product.featured_image_url ? (
                            <img src={product.featured_image_url} alt={product.name_en} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        <div>
                          {product.name_en}
                          <span className="text-xs text-gold-400/80 ml-2 font-persian font-normal">({product.name_fa})</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{product.collections?.name_en || '—'}</td>
                      <td className="px-6 py-4 text-xs font-mono capitalize text-slate-400">{product.product_type || 'Physical'}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`font-medium ${product.stock_quantity <= (product.low_stock_threshold || 5) ? 'text-pomegranate-400' : 'text-slate-300'}`}>
                          {product.stock_quantity ?? 0} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">{formatPrice(product.price)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          product.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {product.status}
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
    </div>
  );
}
