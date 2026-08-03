// ============================================================================
// File: upside-tree/src/app/collections/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Individual collection detail page — shows all products in a collection
//      with the collection's full story context.
//
//      Layout:
//        - Hero: collection name + full story paragraph
//        - Product grid: 2–3 columns
//        - "Read the story" expandable section (cultural context)
//
//      Routing: /collections/roots, /collections/words, etc.
//      generateStaticParams: pre-renders all collection slugs at build time.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ProductCard } from "@/components/shop/ProductCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { Button } from "@/components/ui/Button";
import { normalizeDbCollection, normalizeDbProduct } from "@/lib/catalog";
import { applyCollectionMetadata, getCollectionMetadataMap } from "@/lib/collection-metadata";
import { applyProductMetadata, getProductMetadataMap } from "@/lib/product-metadata";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

// ------------------------------------------------------------------
// Page metadata (dynamic)
// ------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("*, products:products(count)")
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

// ------------------------------------------------------------------
// Collection Detail Page
// ------------------------------------------------------------------

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const [collectionResult, collectionMetadata, productMetadata] = await Promise.all([
    supabase
      .from("collections")
      .select("*, products:products(count)")
      .eq("slug", slug)
      .single(),
    getCollectionMetadataMap(),
    getProductMetadataMap(),
  ]);
  const { data: rawCollection } = collectionResult;

  if (!rawCollection) notFound();

  const [dbCollection] = applyCollectionMetadata([rawCollection], collectionMetadata);
  const collection = normalizeDbCollection(dbCollection);
  const { data: dbProducts } = await supabase
    .from("products")
    .select("*, collections(id, name_en, name_fa, slug)")
    .in("status", ["active", "Active"])
    .order("created_at", { ascending: false });

  const products = applyProductMetadata(dbProducts || [], productMetadata)
    .filter((product) => String(product.collection_id || "") === String(dbCollection.id))
    .map(normalizeDbProduct);

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
        {/* Cover image — full bleed, reduced height */}
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
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(24, 35, 31, 0.35)" }}
            aria-hidden="true"
          />

          {/* Collection name on image */}
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto pb-8">
              <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-400 mb-3 block">
                Collection
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

        {/* Story strip below image */}
        <div className="bg-ivory-300 border-b border-ivory-400 py-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Back link */}
            <Button
              href="/collections"
              variant="ghost"
              size="sm"
              iconLeft={<ArrowLeft size={14} strokeWidth={2} />}
              className="shrink-0"
            >
              All collections
            </Button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-ivory-500" aria-hidden="true" />

            {/* Story sentence */}
            <p className="font-display italic text-base text-ink-500 leading-snug">
              &quot;{collection.story}&quot;
            </p>

            {/* Spacer + product count */}
            <div className="ml-auto shrink-0">
              <span className="text-xs font-body text-ink-400">
                {products.length > 0 ? products.length : collection.productCount} pieces
              </span>
            </div>
          </div>
        </div>
      </section>

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
            /* Empty state — for collections with no mock products yet */
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
          Full cultural context — one paragraph per collection
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
              {collection.story} Every piece in this collection was designed
              around a specific cultural reference — a visual language developed
              over millennia and translated into objects you can carry today.
            </p>
            {/* Persian version */}
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
