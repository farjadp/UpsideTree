import { createClient } from "@/utils/supabase/server";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Sparkles, Folder, Eye } from "lucide-react";
import Link from "next/link";

async function fetchCollectionsResilient() {
  const supabase = await createClient();

  const attempts = [
    () =>
      supabase
        .from("collections")
        .select(`
          *,
          products:products(count)
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    () =>
      supabase
        .from("collections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    () => supabase.from("collections").select("*").order("created_at", { ascending: false }),
    () => supabase.from("collections").select("*"),
  ];

  let lastError: { message?: string | null } | null = null;

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) {
      return { collections: data || [], error: null };
    }

    lastError = error;
  }

  return { collections: [], error: lastError };
}

export default async function CollectionsPage() {
  const { collections, error } = await fetchCollectionsResilient();
  const displayCollections = collections || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Collections</h1>
          <p className="text-sm text-slate-400 mt-1">Organize your products into brand collections and categories.</p>
        </div>
        <Link
          href="/admin/collections/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-500 hover:to-lapis-400 text-white font-medium text-sm shadow-[0_4px_20px_rgba(29,78,137,0.4)] transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Collection
        </Link>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search collections..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lapis-500/50"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 overflow-hidden shadow-xl">
        {error ? (
          <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/10 text-sm text-red-300">
            Failed to load some collection metadata. Showing the raw collection list instead.
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Cover</th>
                <th className="px-6 py-4">Collection</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Products</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Featured</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!displayCollections || displayCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-base font-medium text-slate-300">No collections found</p>
                    <p className="text-xs text-slate-500 mt-1">Get started by creating your first collection.</p>
                  </td>
                </tr>
              ) : (
                displayCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                        {col.cover_image_url || col.banner_image_url ? (
                          <img src={col.cover_image_url || col.banner_image_url} alt={col.name_en} className="w-full h-full object-cover" />
                        ) : (
                          <Folder className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      <div>
                        {col.name_en}
                        <span className="text-xs text-gold-400/80 ml-2 font-persian font-normal">({col.name_fa})</span>
                      </div>
                      {col.story_en && (
                        <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{col.story_en}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{col.slug}</td>
                    <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-950 border border-white/10 font-semibold text-slate-300">
                        {col.products?.[0]?.count ?? col.products?.count ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        col.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-400 border border-white/5'
                      }`}>
                        {col.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {col.featured ? (
                        <span className="text-xs text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-md border border-gold-500/20 font-medium">
                          ★ Featured
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/collections/${col.id}/edit`}
                          className="p-2 rounded-lg bg-slate-950/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
