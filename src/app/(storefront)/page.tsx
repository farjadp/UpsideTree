// ============================================================================
// File: upside-tree/src/app/page.tsx
// Version: 1.2.0 — 2026-08-24
// Why: Upside Tree homepage — the brand's most important page.
//      Sections (in order):
//        1. Hero        — Full-width, story-led; Persian line set in Dibaj
//        2. Collections — Horizontal scroll-snap carousel (populated only)
//        3. Picks       — Tabs: Newest / Best Sellers / Most Viewed,
//                         each ranked from real data (orders, view logs)
//        4. Story       — Brand manifesto pull-quote + motif
//
//      Performance:
//        - Server Component (no 'use client') — full SSG/ISR eligible
//        - Hero image: priority + fetchPriority="high"
//        - Collection carousel: CSS scroll-snap, no JS carousel lib
//
//      Design rules enforced here:
//        - One hero motif (cypress) — not a museum of symbols
//        - 60% ivory / 30% lapis or ink / 10% accent
//        - No gradients (per brand spec)
//        - Persian display voice: Dibaj (self-hosted, /fonts/dibaj)
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import type { StorefrontProduct } from "@/lib/catalog";
import { normalizeDbCollection, normalizeDbProduct } from "@/lib/catalog";
import { getMostViewedProductIds } from "@/lib/product-views";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

// ------------------------------------------------------------------
// Helper: product rail — scroll-snap on mobile, grid feel on desktop
// ------------------------------------------------------------------
function ProductRail({ products }: { products: StorefrontProduct[] }) {
  if (!products || products.length === 0) return null;
  return (
    <div
      className={cn(
        "flex gap-5",
        "snap-container pb-4 pt-2 -mx-5 px-5 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12"
      )}
      role="region"
      tabIndex={0}
    >
      {products.map((product) => (
        <div key={product.id} className="snap-item w-[260px] sm:w-[280px] shrink-0">
          <ProductCard product={product} variant="default" />
        </div>
      ))}
    </div>
  );
}

// Bilingual section header — English display voice on the left, the same
// idea in Dibaj on the right. The Persian is a voice of the brand, not a
// translation footnote.
function SectionHeader({
  id,
  en,
  fa,
  cta,
}: {
  id: string;
  en: string;
  fa: string;
  cta?: { href: string; label: string; id: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-10">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 id={id} className="font-display text-display-md text-lapis-500 font-semibold">
          {en}
        </h2>
        <span
          className="font-persian text-xl sm:text-2xl font-medium text-gold-600"
          lang="fa"
          dir="rtl"
          aria-hidden="true"
        >
          {fa}
        </span>
      </div>
      {cta && (
        <Link
          href={cta.href}
          id={cta.id}
          className={cn(
            "hidden sm:flex items-center gap-2 shrink-0",
            "text-sm font-body font-medium text-lapis-500",
            "hover:text-turquoise-500 transition-colors",
            "group",
          )}
        >
          {cta.label}
          <ArrowRight
            size={14}
            strokeWidth={2}
            className="group-hover:translate-x-1 transition-transform"
          />
        </Link>
      )}
    </div>
  );
}

async function fetchHomepageCollections(supabase: Awaited<ReturnType<typeof createClient>>) {
  const attempts = [
    () =>
      supabase
        .from("collections")
        .select("*, products:products(count)")
        .in("status", ["active", "Active"])
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    () =>
      supabase
        .from("collections")
        .select("*")
        .in("status", ["active", "Active"])
        .order("created_at", { ascending: false }),
    () => supabase.from("collections").select("*").in("status", ["active", "Active"]),
    () => supabase.from("collections").select("*"),
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) {
      return data || [];
    }
  }

  return [];
}

// Quantities actually sold, from paid orders only. At today's volume this
// is a handful of rows; revisit with a materialized view when it isn't.
async function fetchBestSellerIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity, orders!inner(payment_status)")
    .eq("orders.payment_status", "paid")
    .limit(1000);

  if (error || !data) return [] as string[];

  const sold = new Map<string, number>();
  for (const row of data) {
    if (!row.product_id) continue;
    sold.set(row.product_id, (sold.get(row.product_id) ?? 0) + (row.quantity ?? 1));
  }
  return [...sold.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// Rank `products` by the position of their id in `rankedIds`; everything
// unranked keeps its original (newest-first) order after the ranked ones.
function rankProducts(products: StorefrontProduct[], rankedIds: string[]) {
  const position = new Map(rankedIds.map((id, i) => [id, i]));
  return [...products].sort((a, b) => {
    const pa = position.has(a.id) ? position.get(a.id)! : Infinity;
    const pb = position.has(b.id) ? position.get(b.id)! : Infinity;
    return pa - pb;
  });
}

export default async function HomePage() {
  const supabase = await createClient();
  const [dbCollections, { data: dbProducts }, bestSellerIds, mostViewedIds] = await Promise.all([
    fetchHomepageCollections(supabase),
    supabase
      .from("products")
      .select("*, collections(id, name_en, name_fa, slug)")
      .in("status", ["active", "Active"])
      .order("created_at", { ascending: false })
      .limit(24),
    fetchBestSellerIds(supabase),
    getMostViewedProductIds(),
  ]);

  const products = dbProducts || [];
  const productCountsByCollection = products.reduce<Record<string, number>>((counts, product) => {
    if (product.collection_id) {
      counts[String(product.collection_id)] = (counts[String(product.collection_id)] || 0) + 1;
    }
    return counts;
  }, {});
  const allCollections = (dbCollections || [])
    .map((collection) => ({
      ...collection,
      product_count: productCountsByCollection[String(collection.id)] || 0,
    }))
    .map(normalizeDbCollection);

  // The carousel shows the collections where products actually live (the
  // taxonomy's populated leaves, plus any top-level collection holding
  // products directly). Empty taxonomy slots stay in the mega menu.
  const carouselCollections = allCollections
    .filter((collection) => collection.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);
  const totalPieces = allCollections.reduce((sum, c) => sum + c.productCount, 0);

  const allProducts = products.map(normalizeDbProduct);
  const newestProducts = allProducts.slice(0, 8);
  const bestSellingProducts = rankProducts(allProducts, bestSellerIds).slice(0, 8);
  const mostViewedProducts = rankProducts(allProducts, mostViewedIds).slice(0, 8);

  return (
    <>
      {/* ============================================================
          SECTION 1: HERO
          Full-bleed, story-led. No product shown here — just brand.
          "One hero motif per page" rule: cypress only.
          ============================================================ */}
      <section
        id="hero"
        className="relative min-h-[90vh] lg:min-h-screen flex items-center overflow-hidden"
        aria-label="Brand hero"
      >
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-background.png"
            alt="Persian courtyard with stone arches — the architectural backdrop of Upside Tree"
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
            style={{ filter: "brightness(0.92) saturate(0.9)" }}
          />
          {/* Ivory overlay — warm tone, keeps text readable, maintains palette */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(244, 239, 227, 0.45)" }}
            aria-hidden="true"
          />
        </div>

        {/* Hero content */}
        <div className="container mx-auto relative z-10 pt-[var(--navbar-height)]">
          <div className="max-w-[640px]">
            {/* Persian motif — ONE motif, small, positioned above headline */}
            <div className="mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <PersianMotif motif="cypress" size={36} color="#1D4E89" opacity={0.7} />
            </div>

            {/* Main headline */}
            <h1
              className={cn(
                "font-display font-semibold leading-[1.05]",
                // One step past display-xl: the hero owns a full viewport,
                // so the headline has to command it, not sit in a corner.
                "text-[clamp(2.75rem,5.5vw,5rem)] text-lapis-500",
                "mb-6",
                "animate-fade-up",
              )}
              style={{ animationDelay: "250ms" }}
            >
              Made for Now.
              <br />
              <span className="text-ink-500">Rooted in Iran.</span>
            </h1>

            {/* Persian counterpart — Dibaj, held as a second voice, not a
                caption. */}
            <p
              className={cn(
                "font-persian font-medium text-ink-500 text-left",
                "text-[clamp(1.375rem,2.2vw,1.875rem)] leading-relaxed mb-4",
                "animate-fade-up",
              )}
              lang="fa"
              dir="rtl"
              style={{ animationDelay: "300ms" }}
            >
              ریشه در داستان، ساخته برای امروز.
            </p>

            {/* Subheadline */}
            <p
              className={cn(
                "font-body text-base text-ink-400 leading-relaxed mb-10",
                "max-w-md",
                "animate-fade-up",
              )}
              style={{ animationDelay: "350ms" }}
            >
              Contemporary objects that carry the weight of Iranian heritage —
              worn, gifted, and displayed with meaning.
            </p>

            {/* CTA row */}
            <div
              className="flex flex-wrap items-center gap-4 animate-fade-up"
              style={{ animationDelay: "450ms" }}
            >
              <Button
                href="#collections"
                variant="primary"
                size="lg"
                id="hero-explore-cta"
                iconRight={<ArrowRight size={18} strokeWidth={2} />}
              >
                Explore collections
              </Button>
              <Button
                href="/about"
                variant="ghost"
                size="lg"
                id="hero-story-cta"
              >
                The story behind
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: COLLECTIONS CAROUSEL
          Horizontal scroll-snap, CSS-only. Only collections that hold
          products appear; the mega menu owns the full taxonomy.
          ============================================================ */}
      <section
        id="collections"
        className="py-20 overflow-hidden scroll-mt-[var(--navbar-height)]"
        aria-labelledby="collections-heading"
      >
        <div className="container mx-auto">
          <SectionHeader
            id="collections-heading"
            en="The Collections"
            fa="مجموعه‌ها"
            cta={{ href: "/collections", label: "View all", id: "collections-view-all" }}
          />
        </div>

        {/* Scroll container — native CSS scroll snap, no library */}
        <div
          className={cn(
            // Matches the `container` edge (max-width + padding per
            // breakpoint) so the first card lines up with the heading.
            "flex gap-5 px-5 sm:px-6 md:px-8 lg:px-[calc((100vw-64rem)/2+2.5rem)] xl:px-[calc((100vw-80rem)/2+3rem)] 2xl:px-[calc((100vw-96rem)/2+3rem)]",
            "snap-container", // defined in globals.css
            "pb-4",
          )}
          role="region"
          aria-label="Collections carousel — swipe to explore"
          tabIndex={0}
        >
          {carouselCollections.length > 0 ? (
            <>
              {carouselCollections.map((collection, i) => (
                <div key={collection.id} className="snap-item">
                  <CollectionCard
                    collection={collection}
                    variant="carousel"
                    priority={i === 0}
                  />
                </div>
              ))}

              <div className="snap-item">
                <Link
                  href="/collections"
                  id="collections-all-card"
                  className={cn(
                    "w-[260px] sm:w-[300px] shrink-0 aspect-[3/4]",
                    "rounded-brand-xl border-2 border-dashed border-ivory-500",
                    "flex flex-col items-center justify-center gap-4",
                    "bg-ivory-300 hover:bg-ivory-400",
                    "text-ink-400 hover:text-lapis-500",
                    "transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
                    "group",
                  )}
                  aria-label="View all collections"
                >
                  <span
                    className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform"
                    aria-hidden="true"
                  >
                    <ArrowRight size={20} strokeWidth={1.75} />
                  </span>
                  <span className="font-display text-lg font-semibold text-center leading-tight">
                    All<br />collections
                  </span>
                  <span className="text-xs font-body text-ink-300">
                    {totalPieces} pieces total
                  </span>
                </Link>
              </div>
            </>
          ) : (
            <div className="w-full rounded-brand-xl border border-dashed border-ivory-500 bg-ivory-300 px-6 py-16 text-center text-ink-400">
              No collections yet. Create your first collection in the admin panel.
            </div>
          )}
        </div>

        {/* Mobile: swipe hint */}
        <p className="text-center text-xs text-ink-300 font-body mt-4 md:hidden" aria-hidden="true">
          ← Swipe to explore →
        </p>
      </section>

      {/* ============================================================
          SECTION 3: CURATED PICKS
          Tabs ranked from real signals: creation date, paid order
          quantities, and the product-view log. No synthetic ranking.
          ============================================================ */}
      <section className="pt-14 pb-24 bg-ivory-200" aria-labelledby="picks-heading">
        <div className="container mx-auto">
          <Tabs defaultValue="new" className="w-full">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-6">
              <div className="flex items-baseline gap-4 flex-wrap">
                <h2 id="picks-heading" className="font-display text-display-md text-lapis-500 font-semibold">
                  Curated Picks
                </h2>
                <span
                  className="font-persian text-xl sm:text-2xl font-medium text-gold-600"
                  lang="fa"
                  dir="rtl"
                  aria-hidden="true"
                >
                  برگزیده‌ها
                </span>
              </div>
              <TabsList className="bg-ivory-300/50 p-1">
                <TabsTrigger value="new" className="text-sm data-[state=active]:bg-ivory-100">
                  Newest
                </TabsTrigger>
                <TabsTrigger value="best" className="text-sm data-[state=active]:bg-ivory-100">
                  Best Sellers
                </TabsTrigger>
                <TabsTrigger value="viewed" className="text-sm data-[state=active]:bg-ivory-100">
                  Most Viewed
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="new" className="mt-0 outline-none">
              <ProductRail products={newestProducts} />
            </TabsContent>
            <TabsContent value="best" className="mt-0 outline-none">
              <ProductRail products={bestSellingProducts} />
            </TabsContent>
            <TabsContent value="viewed" className="mt-0 outline-none">
              <ProductRail products={mostViewedProducts} />
            </TabsContent>
          </Tabs>

          {allProducts.length === 0 && (
            <div className="rounded-brand-xl border border-dashed border-ivory-500 bg-ivory-300 px-6 py-12 text-center text-ink-400">
              No products yet. Add products from the admin panel to populate this section.
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 4: THE STORY BEHIND
          Brand manifesto — one pull-quote, one motif, max 640px wide.
          The Persian line leads here: this is where Dibaj gets to sing.
          ============================================================ */}
      <section
        id="brand-story"
        className="py-24 lg:py-32"
        aria-labelledby="story-heading"
      >
        <div className="container mx-auto">
          <div className="max-w-[640px] mx-auto text-center">
            {/* Decorative pomegranate motif */}
            <div className="flex justify-center mb-10">
              <PersianMotif motif="pomegranate" size={56} color="#1D4E89" opacity={0.6} />
            </div>

            {/* Persian manifesto line — set first, large, in Dibaj */}
            <p
              className="font-persian font-semibold text-center text-balance text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.9] text-lapis-500 mb-8"
              lang="fa"
              dir="rtl"
            >
              ما شاخه‌ای زنده از درختی بسیار کهن هستیم —
              <br />
              که از ریشه‌هایش به بالا می‌روید.
            </p>

            {/* Gold separator */}
            <div
              className="w-16 h-0.5 bg-gold-500 mx-auto mb-8"
              aria-hidden="true"
            />

            {/* English counterpart */}
            <h2
              id="story-heading"
              className="font-display text-display-sm text-ink-500 font-semibold leading-[1.3] mb-6"
            >
              We are the living branch of a very old tree —
              growing upward from its roots.
            </h2>

            <p className="font-body text-base text-ink-400 leading-relaxed mb-10">
              Every object we make is rooted in a real story — a poem, a motif,
              a ritual — translated into something you carry, wear, or give.
            </p>

            <Button
              href="/about"
              variant="ghost"
              size="md"
              id="story-read-more"
            >
              Read the full story
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
