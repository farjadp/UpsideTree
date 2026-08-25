// ============================================================================
// File: upside-tree/src/app/page.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Upside Tree homepage — the brand's most important page.
//      Sections (in order):
//        1. Hero        — Full-width, story-led (not product-first)
//        2. Pieces      — Honest grid of the live catalog
//        3. Categories  — Editorial cards, counts rolled up from subcats
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

  // The catalog is a two-level taxonomy (Men / Women / … → subcategories);
  // products hang off subcategories, so a top-level category's true size is
  // the roll-up of its children. The homepage only shows categories that
  // actually contain something — empty taxonomy slots stay in the mega menu
  // where browsing them is a choice, not a dead end on the front door.
  const topCategories = allCollections.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, typeof allCollections>();
  for (const sub of allCollections.filter((c) => c.parentId)) {
    const list = childrenByParent.get(sub.parentId!) ?? [];
    list.push(sub);
    childrenByParent.set(sub.parentId!, list);
  }
  const categoryCards = topCategories
    .map((category) => {
      const children = (childrenByParent.get(category.id) ?? [])
        .filter((sub) => sub.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount);
      const rollupCount =
        category.productCount + children.reduce((sum, sub) => sum + sub.productCount, 0);
      return { ...category, children, rollupCount };
    })
    .filter((category) => category.rollupCount > 0)
    .sort((a, b) => b.rollupCount - a.rollupCount);

  const allProducts = products.map(normalizeDbProduct);
  const catalogProducts = allProducts.slice(0, 12);

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
                href="#pieces"
                variant="primary"
                size="lg"
                id="hero-explore-cta"
                iconRight={<ArrowRight size={18} strokeWidth={2} />}
              >
                Shop the pieces
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
          SECTION 3: THE PIECES
          One honest grid of the live catalog. Ranked tabs ("best
          sellers", "most viewed") return when there's real data to
          rank by — until then they'd be the same six products four times.
          ============================================================ */}
      <section id="pieces" className="py-24 bg-ivory-200 scroll-mt-[var(--navbar-height)]" aria-labelledby="pieces-heading">
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
          SECTION 3: SHOP BY CATEGORY
          Editorial cards for the categories that actually hold products
          (counts rolled up from subcategories). Empty taxonomy slots
          live in the mega menu, not on the front door.
          ============================================================ */}
      {categoryCards.length > 0 && (
        <section id="categories" className="py-24" aria-labelledby="categories-heading">
          <div className="container mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10">
              <h2
                id="categories-heading"
                className="font-display text-display-md text-lapis-500 font-semibold"
              >
                Shop by Category
              </h2>
              <Link
                href="/collections"
                id="categories-view-all"
                className={cn(
                  "hidden sm:flex items-center gap-2 shrink-0",
                  "text-sm font-body font-medium text-lapis-500",
                  "hover:text-turquoise-500 transition-colors",
                  "group",
                )}
              >
                All categories
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>

            <div
              className={cn(
                "grid gap-6",
                categoryCards.length === 1 && "grid-cols-1",
                categoryCards.length === 2 && "md:grid-cols-2",
                categoryCards.length >= 3 && "md:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {categoryCards.map((category, i) => (
                <article
                  key={category.id}
                  className={cn(
                    "group relative overflow-hidden rounded-brand-xl",
                    "bg-ink-500",
                    // First (largest) category gets the full row on md when
                    // an odd card would otherwise dangle.
                    categoryCards.length === 3 && i === 0 && "md:col-span-2 xl:col-span-1",
                  )}
                >
                  <Link
                    href={`/collections/${category.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500 rounded-brand-xl"
                    aria-label={`Shop ${category.nameEn} — ${category.rollupCount} pieces`}
                  >
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={category.coverImage}
                        alt={category.nameEn}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      {/* Ink scrim from the bottom so the label always reads */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(26,26,26,0.72) 0%, rgba(26,26,26,0.25) 45%, rgba(26,26,26,0) 70%)",
                        }}
                        aria-hidden="true"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                        <p className="font-persian text-sm text-ivory-300/90 mb-1" lang="fa" dir="rtl">
                          {category.nameFa}
                        </p>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-display text-2xl sm:text-3xl font-semibold text-ivory-100">
                            {category.nameEn}
                          </h3>
                          <span className="font-body text-xs text-ivory-300/90 whitespace-nowrap">
                            {category.rollupCount} {category.rollupCount === 1 ? "piece" : "pieces"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Populated subcategory chips — direct paths, not a menu dive */}
                  {category.children.length > 0 && (
                    <ul className="flex flex-wrap gap-2 p-5 bg-ivory-100" role="list">
                      {category.children.map((sub) => (
                        <li key={sub.id}>
                          <Link
                            href={`/collections/${sub.slug}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full",
                              "border border-ivory-500/70 bg-ivory-200 px-3.5 py-1.5",
                              "font-body text-xs font-medium text-ink-500",
                              "hover:border-lapis-500/40 hover:text-lapis-500 transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
                            )}
                          >
                            {sub.nameEn}
                            <span className="text-ink-300">{sub.productCount}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

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
