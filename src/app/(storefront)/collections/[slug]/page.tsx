// ============================================================================
// File: upside-tree/src/app/collections/[slug]/page.tsx
// Version: 1.1.0 — 2026-08-24
// Why: Individual collection detail page — now handles both main categories
//      and subcategories. Main categories list subcategory cards and the
//      products in all their subcollections.
//
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { Button } from "@/components/ui/Button";
import { normalizeDbCollection, normalizeDbProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { countActiveProductsByCollection, fetchActiveProductsInCollections } from "@/lib/collection-membership";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Collection not found" };
  const collection = normalizeDbCollection(data);

  return {
    title: `${collection.nameEn} Collection`,
    description: collection.story,
    openGraph: {
      title: `${collection.nameEn} | Upside Tree`,
      description: collection.story,
      images: [{ url: collection.coverImage, width: 1200, height: 630 }],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dbCollection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!dbCollection) notFound();

  const collection = normalizeDbCollection(dbCollection);

  const [{ data: dbSubcategories }, counts] = await Promise.all([
    supabase
      .from("collections")
      .select("*")
      .eq("parent_id", collection.id)
      .in("status", ["active", "Active"])
      .order("sort_order", { ascending: true }),
    countActiveProductsByCollection(supabase),
  ]);

  const subcategories = (dbSubcategories || [])
    .map((sub) => ({ ...sub, product_count: counts.byCollection[String(sub.id)] || 0 }))
    .map(normalizeDbCollection);

  const targetIds = subcategories.length > 0
    ? [collection.id, ...subcategories.map((s) => s.id)]
    : [collection.id];

  const dbProducts = await fetchActiveProductsInCollections(supabase, targetIds);
  const products = dbProducts.map(normalizeDbProduct);

  return (
    <>
      {/* ============================================================
          COLLECTION HERO
          ============================================================ */}
      <section
        id={`collection-hero-${slug}`}
        className="relative overflow-hidden"
        aria-label={`${collection.nameEn} collection`}
      >
        <div className="relative h-[50vh] min-h-[320px] max-h-[520px]">
          <Image
            src={collection.coverImage}
            alt={`${collection.nameEn} — ${collection.story}`}
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
            style={{ filter: "brightness(0.8) saturate(0.85)" }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(24, 35, 31, 0.35)" }}
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto pb-8">
              <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-400 mb-3 block">
                {subcategories.length > 0 ? "Category" : "Collection"}
              </span>
              <h1 className="font-display text-display-xl text-ivory-200 font-semibold">
                {collection.nameEn}
              </h1>
              <p
                className="font-persian text-xl text-ivory-300 mt-2"
                lang="fa"
                dir="rtl"
              >
                {collection.nameFa}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-ivory-300 border-b border-ivory-400 py-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Button
              href="/collections"
              variant="ghost"
              size="sm"
              iconLeft={<ArrowLeft size={14} strokeWidth={2} />}
              className="shrink-0"
            >
              All collections
            </Button>

            <div className="hidden sm:block w-px h-6 bg-ivory-500" aria-hidden="true" />

            <p className="font-display italic text-base text-ink-500 leading-snug">
              &quot;{collection.story}&quot;
            </p>

            <div className="ml-auto shrink-0">
              <span className="text-xs font-body text-ink-400">
                {products.length} pieces
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SUBCATEGORIES (main category only)
          ============================================================ */}
      {subcategories.length > 0 && (
        <section
          id={`collection-subcategories-${slug}`}
          className="py-12 lg:py-16 bg-ivory-200 border-b border-ivory-400"
        >
          <div className="container mx-auto">
            <h2 className="font-display text-display-sm text-lapis-500 font-semibold mb-6">
              Browse {collection.nameEn}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/collections/${sub.slug}`}
                  className={cn(
                    "group block rounded-brand-xl overflow-hidden",
                    "border-2 border-transparent hover:border-gold-500/60",
                    "bg-ivory-300 shadow-brand-sm hover:shadow-brand-md",
                    "transition-all duration-300",
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={sub.coverImage}
                      alt={sub.nameEn}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-ink-500/40" aria-hidden="true" />
                    <div className="absolute inset-0 flex items-end p-4">
                      <h3 className="font-display text-lg text-ivory-200 font-semibold">
                        {sub.nameEn}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs text-ink-400">
                      {sub.productCount} pieces
                    </span>
                    <span className="text-sm text-gold-500 font-medium">Explore</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          PRODUCT GRID
          ============================================================ */}
      <section
        id={`collection-products-${slug}`}
        className="py-16 lg:py-20"
        aria-labelledby="products-heading"
      >
        <div className="container mx-auto">
          <h2 id="products-heading" className="sr-only">
            Products in {collection.nameEn}
          </h2>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="default"
                  priority={i < 2}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="mb-8 flex justify-center opacity-30">
                <PersianMotif motif="geometric" size={64} color="#1D4E89" />
              </div>
              <h3 className="font-display text-xl text-ink-400 mb-2">
                More pieces coming soon
              </h3>
              <p className="text-sm text-ink-400 font-body mb-8">
                This collection is being curated. Check back soon.
              </p>
              <Button href="/collections" variant="ghost" size="md">
                Browse other collections
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          COLLECTION STORY SECTION
          ============================================================ */}
      <section
        id={`collection-story-${slug}`}
        className="py-16 bg-ivory-300 border-t border-ivory-400"
        aria-labelledby="story-section-heading"
      >
        <div className="container mx-auto">
          <div className={cn(
            "max-w-[640px]",
            "flex flex-col gap-6",
          )}>
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500">
              The story behind
            </p>
            <h2
              id="story-section-heading"
              className="font-display text-display-sm text-lapis-500 font-semibold"
            >
              Where this collection comes from
            </h2>
            <div
              className="w-12 h-0.5 bg-gold-500"
              aria-hidden="true"
            />
            <p className="font-body text-base text-ink-400 leading-relaxed">
              {collection.story} Every piece was designed around a specific cultural reference — a visual language developed over millennia and translated into objects you can carry today.
            </p>
            <p
              className="font-persian text-base text-ink-400 leading-relaxed text-right"
              lang="fa"
              dir="rtl"
            >
              {collection.storyFa}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
