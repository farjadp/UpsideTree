import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { updateProduct } from "../../actions";
import { getProductImages } from "@/lib/products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  const updateProductAction = updateProduct.bind(null, product.id);
  const images = getProductImages(product);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">
            Edit Product
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Update the live product record used by the current database schema.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 shadow-xl">
        <form action={updateProductAction} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                <img
                  src={images[0]}
                  alt={product.name_en}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-500">
                Image is currently derived from local assets because the live database schema does not expose the newer media fields.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Name (EN)</label>
                  <input
                    type="text"
                    name="name_en"
                    defaultValue={product.name_en || ""}
                    required
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">نام (FA)</label>
                  <input
                    type="text"
                    name="name_fa"
                    defaultValue={product.name_fa || ""}
                    required
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-300">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={product.slug || ""}
                    required
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50 font-mono"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-300">Description (EN)</label>
                  <textarea
                    name="description_en"
                    rows={4}
                    defaultValue={product.description_en || ""}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-300">توضیحات (FA)</label>
                  <textarea
                    name="description_fa"
                    rows={4}
                    defaultValue={product.description_fa || ""}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Price</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={product.price ?? 0}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Currency</label>
                  <select
                    name="currency"
                    defaultValue={product.currency || "CAD"}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Stock Level</label>
                  <input
                    type="number"
                    name="stock_level"
                    min="0"
                    defaultValue={product.stock_level ?? 0}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Status</label>
                  <select
                    name="status"
                    defaultValue={product.status || "Draft"}
                    className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-white/5 mt-6">
            <Button
              type="submit"
              className="bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white border-0"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
