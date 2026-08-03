// ============================================================================
// File: upside-tree/src/app/collections/page.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Collections listing page — the brand's primary navigation page.
//      Shows all 5 collections as a grid with cover images and stories.
//      This is NOT a product grid — it is collection-level navigation.
//
//      Layout:
//        - Hero: collection page intro (minimal, no product shown)
//        - Grid: 5 collection cards (2 cols mobile / 3 cols desktop)
//        - Stats bar: total pieces, collections, and makers
//
//      Design:
//        - One motif used: geometric (represents pattern across collections)
//        - Ivory background throughout
//        - Collection names as EN/FA bilingual toggle on each card
//
//      SEO: generateMetadata exports page-level meta for this route.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { normalizeDbCollection } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

// ------------------------------------------------------------------
// Page metadata (SEO)
// ------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse all Upside Tree collections: Roots, Words, Rituals, Made by Hand, and Limited Stories. Contemporary objects rooted in Iranian heritage.",
  openGraph: {
    title: "Collections | Upside Tree",
    description:
      "Five collections. One living tradition. Roots, Words, Rituals, Made by Hand, Limited Stories.",
  },
};

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: dbCollections } = await supabase
    .from("collections")
    .select("*, products:products(count)")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const collections = (dbCollections || []).map(normalizeDbCollection);
  const totalPieces = collections.reduce((sum, collection) => sum + collection.productCount, 0);

  return (
    <>
      {/* ============================================================
          PAGE HERO — minimal header, no product imagery
          ============================================================ */}
      <section
        id="collections-hero"
        className={cn(
          "pt-[calc(var(--navbar-height)+4rem)] pb-12",
          "bg-ivory-200",
        )}
        aria-label="Collections overview"
      >
        <div className="container mx-auto">
          {/* Geometric motif — one motif only */}
          <div className="mb-8 opacity-40">
            <PersianMotif motif="geometric" size={56} color="#1D4E89" />
          </div>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-xs font-body text-ink-400" role="list">
              <li>
                <a href="/" className="hover:text-lapis-500 transition-colors">Home</a>
              </li>
              <li aria-hidden="true">
                <span>/</span>
              </li>
              <li aria-current="page">
                <span className="text-ink-500 font-medium">Collections</span>
              </li>
            </ol>
          </nav>

          {/* Heading */}
          <h1 className="font-display text-display-lg text-lapis-500 font-semibold mb-4">
            The Collections
          </h1>

          {/* Persian subtitle */}
          <p
            className="font-persian text-base text-ink-400 mb-4"
            lang="fa"
            dir="rtl"
          >
            مجموعه‌ها
          </p>

          <p className="font-body text-base text-ink-400 max-w-lg leading-relaxed">
            Each collection is organized around a theme — a symbol, a word, a ritual,
            a maker, or a singular story. Browse by what moves you.
          </p>
        </div>
      </section>

      {/* ============================================================
          STATS BAR
          ============================================================ */}
      <section
        aria-label="Collection statistics"
        className="border-y border-ivory-400 bg-ivory-300 py-5"
      >
        <div className="container mx-auto">
          <dl className="flex flex-wrap items-center gap-8 sm:gap-16">
            {[
              { label: "Collections",    value: collections.length.toString() },
              { label: "Total pieces",   value: totalPieces.toString() },
              { label: "Made by hand",   value: "4" },
              { label: "Numbered editions", value: "3" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-[10px] font-body font-semibold tracking-[0.15em] uppercase text-ink-400">
                  {label}
                </dt>
                <dd className="font-display text-2xl font-semibold text-lapis-500">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============================================================
          COLLECTION GRID
          ============================================================ */}
      <section
        id="collections-grid"
        className="py-16 lg:py-20"
        aria-labelledby="grid-heading"
      >
        <div className="container mx-auto">
          <h2 id="grid-heading" className="sr-only">All collections</h2>

          {/* Grid — responsive: 1 col → 2 col → 3 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {collections.map((collection, i) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                variant="grid"
                priority={i < 2}
              />
            ))}
          </div>

          {collections.length === 0 && (
            <div className="rounded-brand-xl border border-dashed border-ivory-500 bg-ivory-300 px-6 py-16 text-center text-ink-400">
              No collections yet. Create your first collection from the admin panel.
            </div>
          )}

          {/* Bottom note */}
          <div className="mt-16 pt-8 border-t border-ivory-400 text-center">
            <p className="font-display italic text-base text-ink-400 max-w-prose mx-auto">
              &quot;Not every object needs to tell a story. But ours do.&quot;
            </p>
            <div
              className="w-12 h-0.5 bg-gold-500 mx-auto mt-4"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>
    </>
  );
}
