// ============================================================================
// File: upside-tree/src/app/page.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Upside Tree homepage — the brand's most important page.
//      Sections (in order):
//        1. Hero        — Full-width, story-led (not product-first)
//        2. Collections — Horizontal scroll-snap carousel (3 featured)
//        3. Featured    — 3 curated products with emotional headlines
//        4. Story       — Brand manifesto pull-quote + motif
//        5. UGC         — Instagram/UGC feed placeholder
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
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CollectionCard } from "@/components/shop/CollectionCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { getFeaturedCollections, getAllCollections } from "@/lib/mock/collections";
import { getFeaturedProducts } from "@/lib/mock/products";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Data fetching (server-side — will move to Supabase in Phase 2)
// ------------------------------------------------------------------

const featuredCollections = getFeaturedCollections();
const allCollections      = getAllCollections();
const featuredProducts    = getFeaturedProducts(6);

// ------------------------------------------------------------------
// Homepage
// ------------------------------------------------------------------

export default function HomePage() {
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

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce"
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

          {/* "All collections" card at end */}
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
              aria-label="View all 5 collections"
            >
              <span
                className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform"
                aria-hidden="true"
              >
                <ArrowRight size={20} strokeWidth={1.75} />
              </span>
              <span className="font-display text-lg font-semibold text-center leading-tight">
                All 5<br />collections
              </span>
              <span className="text-xs font-body text-ink-300">
                {allCollections.reduce((sum, c) => sum + c.productCount, 0)} pieces total
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile: swipe hint */}
        <p className="text-center text-xs text-ink-300 font-body mt-4 md:hidden" aria-hidden="true">
          ← Swipe to explore →
        </p>
      </section>

      {/* ============================================================
          SECTION 3: FEATURED PRODUCTS
          3 curated products — featured=true in mock data
          ============================================================ */}
      <section
        id="featured-products"
        className="py-20 bg-ivory-300"
        aria-labelledby="featured-heading"
      >
        <div className="container mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-2">
              Curated for you
            </p>
            <h2
              id="featured-heading"
              className="font-display text-display-md text-lapis-500 font-semibold"
            >
              Right now, we love these
            </h2>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="featured"
                priority={i === 0}
              />
            ))}
          </div>

          {/* View all products CTA */}
          <div className="text-center mt-12">
            <Button
              href="/collections"
              variant="ghost"
              size="lg"
              id="featured-view-all"
              iconRight={<ArrowRight size={18} strokeWidth={2} />}
            >
              Browse all collections
            </Button>
          </div>
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
          SECTION 5: UGC / INSTAGRAM PLACEHOLDER
          6-cell grid — real feed connects in Phase 2 via Instagram API
          ============================================================ */}
      <section
        id="ugc-feed"
        className="pb-20"
        aria-labelledby="ugc-heading"
      >
        <div className="container mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-2">
              Community
            </p>
            <h2
              id="ugc-heading"
              className="font-display text-display-sm text-ink-500 font-semibold"
            >
              Rooted in real life
            </h2>
            <p className="text-sm text-ink-400 font-body mt-2">
              Tag{" "}
              <a
                href="https://instagram.com/upsidertree"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lapis-500 hover:text-turquoise-500 font-medium transition-colors"
              >
                @upsidertree
              </a>{" "}
              to be featured
            </p>
          </div>

          {/* UGC Grid — placeholder tiles with brand-toned overlays */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3"
            aria-label="Instagram feed (coming soon)"
          >
            {[
              { bg: "bg-ivory-400",       opacity: "0.7" },
              { bg: "bg-lapis-100",       opacity: "0.5" },
              { bg: "bg-gold-100",        opacity: "0.6" },
              { bg: "bg-ivory-300",       opacity: "0.8" },
              { bg: "bg-turquoise-50",    opacity: "0.6" },
              { bg: "bg-pomegranate-50",  opacity: "0.5" },
            ].map((cell, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-brand overflow-hidden relative",
                  cell.bg,
                  "flex items-center justify-center",
                )}
                aria-hidden="true"
              >
                {/* Placeholder brand mark */}
                <div
                  className="opacity-20"
                  style={{ opacity: parseFloat(cell.opacity) * 0.3 }}
                >
                  <PersianMotif
                    motif={["cypress", "pomegranate", "geometric", "cypress", "geometric", "pomegranate"][i] as "cypress" | "pomegranate" | "geometric"}
                    size={40}
                    color="#1D4E89"
                  />
                </div>

                {/* Hover overlay with Instagram icon */}
                <div className="absolute inset-0 bg-lapis-500/0 hover:bg-lapis-500/10 transition-colors cursor-pointer flex items-center justify-center">
                  <Sparkles size={20} className="text-lapis-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          {/* Follow CTA */}
          <div className="text-center mt-8">
            <a
              id="ugc-instagram-follow"
              href="https://instagram.com/upsidertree"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2",
                "text-sm font-body font-medium text-lapis-500",
                "hover:text-turquoise-500 transition-colors",
                "border-b border-lapis-300 hover:border-turquoise-500 pb-0.5",
              )}
            >
              Follow @upsidertree on Instagram
              <ArrowRight size={14} strokeWidth={2} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
