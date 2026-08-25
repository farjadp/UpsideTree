// ============================================================================
// File: upside-tree/src/app/search/page.tsx
// Why: Product search — the mobile bottom nav and the navbar search icon
//      both land here. Server-rendered: ?q= queries the live catalog over
//      the bilingual name and description columns.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { normalizeDbProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Upside Tree catalog — canvases, jewelry, and drinkware rooted in Iranian heritage.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const supabase = await createClient();

  let products: ReturnType<typeof normalizeDbProduct>[] = [];
  if (query) {
    // Escape PostgREST pattern characters so a user typing "%" or ","
    // can't distort the filter.
    const safe = query.replace(/[%_,()]/g, " ").trim();
    const pattern = `%${safe}%`;
    const { data } = await supabase
      .from("products")
      .select("*, collections(id, name_en, name_fa, slug)")
      .in("status", ["active", "Active"])
      .or(
        [
          `name_en.ilike.${pattern}`,
          `name_fa.ilike.${pattern}`,
          `desc_functional_en.ilike.${pattern}`,
          `desc_story_en.ilike.${pattern}`,
        ].join(",")
      )
      .limit(24);
    products = (data ?? []).map(normalizeDbProduct);
  } else {
    // Empty query: show the catalog so the page is a storefront, not a wall.
    const { data } = await supabase
      .from("products")
      .select("*, collections(id, name_en, name_fa, slug)")
      .in("status", ["active", "Active"])
      .order("created_at", { ascending: false })
      .limit(12);
    products = (data ?? []).map(normalizeDbProduct);
  }

  return (
    <section className="pt-[calc(var(--navbar-height)+3rem)] pb-24 min-h-[70vh]">
      <div className="container mx-auto px-5 sm:px-8">
        <div className="flex items-baseline gap-4 flex-wrap mb-8">
          <h1 className="font-display text-display-md text-lapis-500 font-semibold">Search</h1>
          <span className="font-persian text-xl font-medium text-gold-600" lang="fa" dir="rtl" aria-hidden="true">
            جستجو
          </span>
        </div>

        {/* GET form — shareable URLs, works without JS */}
        <form action="/search" method="get" role="search" className="mb-12 max-w-xl">
          <div
            className={cn(
              "flex items-center gap-3 rounded-brand-lg border border-ivory-500 bg-ivory-100",
              "px-4 py-3 focus-within:ring-2 focus-within:ring-lapis-500",
            )}
          >
            <Search size={18} strokeWidth={1.75} className="text-ink-300 shrink-0" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search canvases, jewelry, mugs…"
              aria-label="Search products"
              autoFocus={!query}
              className="w-full bg-transparent font-body text-base text-ink-500 placeholder:text-ink-300 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-brand bg-lapis-500 px-4 py-1.5 font-body text-sm font-medium text-ivory-100 hover:bg-lapis-600 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {query && (
          <p className="font-body text-sm text-ink-400 mb-6">
            {products.length > 0
              ? `${products.length} ${products.length === 1 ? "piece" : "pieces"} for “${query}”`
              : `Nothing matched “${query}” — here's what we make instead:`}
          </p>
        )}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} variant="default" />
            ))}
          </div>
        ) : (
          <EmptyFallback supabase={supabase} />
        )}
      </div>
    </section>
  );
}

// No matches: keep the journey moving with the live catalog instead of a
// dead end.
async function EmptyFallback({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
  const { data } = await supabase
    .from("products")
    .select("*, collections(id, name_en, name_fa, slug)")
    .in("status", ["active", "Active"])
    .order("created_at", { ascending: false })
    .limit(8);
  const products = (data ?? []).map(normalizeDbProduct);
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="default" />
      ))}
    </div>
  );
}
