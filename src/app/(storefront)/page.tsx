// ============================================================================
// File: upside-tree/src/app/page.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Upside Tree homepage — the brand's most important page.
//      Sections (in order):
//        1. Hero        — Full-width, story-led (not product-first)
//        2. Collections — Horizontal scroll-snap carousel (featured)
//        3. Pieces      — Honest grid of the live catalog
//        4. Story       — Brand manifesto pull-quote + motif
//        5. How it's made — real promises (made-to-order, Stripe, EN/FA)
//
//      Performance:
//        - Server Component (no 'use client') — full SSG/ISR eligible
//        - Hero image: priority + fetchPriority="high"
//        - Collection carousel: CSS scroll-snap, no JS carousel lib
//        - Intersection Observer for entrance animations (CSS-driven)
//
//      Design rules enforced here:
//        - One hero motif (cypress) — not a museum of symbols
//        - 60% ivory / 30% lapis or ink / 10% accent
//        - No gradients (per brand spec)
//        - CTA buttons: Pomegranate Red only
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, Truck, ShieldCheck, Languages } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import type { StorefrontProduct } from "@/lib/catalog";
import { normalizeDbCollection, normalizeDbProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

// ------------------------------------------------------------------
// Helper: honest product grid. Every card is a real, purchasable
// product straight from the live catalog — no synthetic "best sellers"
// until there is real sales data to rank by.
// ------------------------------------------------------------------
function ProductGridSection({ products }: { products: StorefrontProduct[] }) {
  if (!products || products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="default" />
      ))}
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

export default async function HomePage() {
  const supabase = await createClient();
  const [dbCollections, { data: dbProducts }] = await Promise.all([
    fetchHomepageCollections(supabase),
    supabase
      .from("products")
      .select("*, collections(id, name_en, name_fa, slug)")
      .in("status", ["active", "Active"])
      .order("created_at", { ascending: false })
      .limit(24),
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
  const featuredCollections = allCollections.filter((collection) => collection.featured).slice(0, 5);
  const allProducts = products.map(normalizeDbProduct);
  const catalogProducts = allProducts.slice(0, 12);
  const totalPieces = allCollections.reduce((sum, collection) => sum + collection.productCount, 0);

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

            {/* Kicker label */}
            <p
              className={cn(
                "text-xs font-body font-semibold tracking-[0.2em] uppercase",
                "text-gold-500 mb-4",
                "animate-fade-up",
              )}
              style={{ animationDelay: "150ms" }}
            >
              Rooted in Story
            </p>

            {/* Main headline */}
            <h1
              className={cn(
                "font-display font-semibold leading-[1.05]",
                "text-display-xl text-lapis-500",
                "mb-6",
                "animate-fade-up",
              )}
              style={{ animationDelay: "250ms" }}
            >
              Made for Now.
              <br />
              <span className="text-ink-500">Rooted in Iran.</span>
            </h1>

            {/* Persian subtitle */}
            <p
              className={cn(
                "font-persian text-ink-400 text-lg mb-3",
                "animate-fade-up",
              )}
              lang="fa"
              dir="rtl"
              style={{ animationDelay: "300ms", textAlign: "right", maxWidth: "320px" }}
            >
              ریشه در داستان. ساخته برای امروز.
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
                href="/collections"
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

        {/* Scroll indicator — static hairline; the bounce read as noise
            against an otherwise still hero */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          aria-hidden="true"
        >
          <div className="w-px h-12 bg-lapis-500/30 mx-auto" />
        </div>
      </section>

      {/* ============================================================
          SECTION 2: COLLECTIONS CAROUSEL
          Horizontal scroll-snap, CSS-only (no JS carousel library)
          ============================================================ */}
      <section
        id="collections"
        className="py-20 overflow-hidden"
        aria-labelledby="collections-heading"
      >
        <div className="container mx-auto mb-10">
          {/* Section header */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-2">
                Browse by story
              </p>
              <h2
                id="collections-heading"
                className="font-display text-display-md text-lapis-500 font-semibold"
              >
                The Collections
              </h2>
            </div>
            <Link
              href="/collections"
              id="collections-view-all"
              className={cn(
                "hidden sm:flex items-center gap-2",
                "text-sm font-body font-medium text-lapis-500",
                "hover:text-turquoise-500 transition-colors",
                "group",
              )}
            >
              View all
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </div>

        {/* Scroll container — native CSS scroll snap, no library */}
        <div
          className={cn(
            "flex gap-5 px-5 sm:px-8 lg:px-[max(2.5rem,calc((100vw-80rem)/2))]",
            "snap-container", // defined in globals.css
            "pb-4",
          )}
          role="region"
          aria-label="Collections carousel — swipe to explore"
          tabIndex={0}
        >
          {featuredCollections.length > 0 ? (
            <>
              {featuredCollections.map((collection, i) => (
                <div
                  key={collection.id}
                  className="snap-item"
                >
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
          SECTION 3: THE PIECES
          One honest grid of the live catalog. Ranked tabs ("best
          sellers", "most viewed") return when there's real data to
          rank by — until then they'd be the same six products four times.
          ============================================================ */}
      <section className="py-24 bg-ivory-200" aria-labelledby="pieces-heading">
        <div className="container mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 id="pieces-heading" className="font-display text-display-md text-lapis-500 font-semibold">
                The Pieces
              </h2>
              <p className="font-body text-sm text-ink-400 mt-2 max-w-md">
                Every piece is made to order — printed, stretched, or engraved when you order it.
              </p>
            </div>
            <Link
              href="/collections"
              id="pieces-view-all"
              className={cn(
                "hidden sm:flex items-center gap-2 shrink-0",
                "text-sm font-body font-medium text-lapis-500",
                "hover:text-turquoise-500 transition-colors",
                "group",
              )}
            >
              Shop all
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          {catalogProducts.length > 0 ? (
            <ProductGridSection products={catalogProducts} />
          ) : (
            <div className="rounded-brand-xl border border-dashed border-ivory-500 bg-ivory-300 px-6 py-12 text-center text-ink-400">
              No products yet. Add products from the admin panel to populate this section.
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 4: THE STORY BEHIND
          Brand manifesto — one pull-quote, one motif, max 640px wide
          Design rule: no clutter, ivory space is intentional
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

            {/* Label */}
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-6">
              The story behind
            </p>

            {/* Pull quote headline */}
            <h2
              id="story-heading"
              className="font-display text-display-lg text-ink-500 font-semibold leading-[1.15] mb-6"
            >
              Objects that carry four thousand years of memory — without the weight.
            </h2>

            {/* Gold separator */}
            <div
              className="w-16 h-0.5 bg-gold-500 mx-auto mb-8"
              aria-hidden="true"
            />

            {/* Manifesto body */}
            <p className="font-body text-base text-ink-400 leading-relaxed mb-6">
              Upside Tree is a Persian cultural product brand built for the Iranian diaspora
              and anyone who finds meaning in ancient symbols made modern.
              Every object we make is rooted in a real story — a poem, a motif,
              a ritual — translated into something you carry, wear, or give.
            </p>

            <p className="font-body text-base text-ink-400 leading-relaxed mb-10">
              We are not a museum. We are not nostalgia.
              We are the living branch of a very old tree —
              growing upward from its roots.
            </p>

            {/* Persian manifesto line */}
            <p
              className="font-persian text-lg text-lapis-500 mb-10"
              lang="fa"
              dir="rtl"
            >
              ما شاخه‌ای زنده از درختی بسیار کهن هستیم — که از ریشه‌هایش به بالا می‌روید.
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

      {/* ============================================================
          SECTION 5: HOW IT'S MADE — real promises only
          (The Instagram/UGC grid returns when there is a real feed to
          show; placeholder tiles undermined the sections above it.)
          ============================================================ */}
      <section
        id="how-its-made"
        className="pb-20"
        aria-labelledby="how-heading"
      >
        <div className="container mx-auto">
          <h2 id="how-heading" className="sr-only">
            How Upside Tree works
          </h2>
          <div className="border-y border-ivory-500/60">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Package,
                  title: "Made to order",
                  body: "Nothing sits in a warehouse. Each piece is produced when you order it.",
                },
                {
                  icon: Truck,
                  title: "Ships worldwide",
                  body: "Printed and dispatched from production partners close to you.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure checkout",
                  body: "Payments handled end-to-end by Stripe. We never see your card.",
                },
                {
                  icon: Languages,
                  title: "دو زبانه — bilingual",
                  body: "Every story told in English and Persian, side by side.",
                },
              ].map(({ icon: Icon, title, body }, i) => (
                <div
                  key={title}
                  className={cn(
                    "flex flex-col gap-3 px-6 py-10",
                    // hairline separators between cells, not card borders
                    i > 0 && "border-t sm:border-t-0 lg:border-l border-ivory-500/60",
                    i >= 2 && "border-t lg:border-t-0",
                    i % 2 === 1 && "border-l lg:border-l border-ivory-500/60",
                  )}
                >
                  <Icon size={22} strokeWidth={1.75} className="text-lapis-500" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-ink-500">{title}</h3>
                  <p className="font-body text-sm text-ink-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
