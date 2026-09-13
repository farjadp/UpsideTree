// ============================================================================
// File: upside-tree/src/app/collections/page.tsx
// Version: 1.1.0 — 2026-08-24
// Why: Collections listing page — now organized as a hierarchy.
//      Lists the 5 main categories (Men, Women, Kids, Accessories, Home and Living)
//      with their subcategories. Each main category appears as a card and its
//      subcategories as a tag/links list.
//
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { normalizeDbCollection } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { countActiveProductsByCollection } from "@/lib/collection-membership";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse all Upside Tree collections: Men, Women, Kids, Accessories, and Home and Living. Contemporary objects rooted in Iranian heritage.",
  openGraph: {
    title: "Collections | Upside Tree",
    description:
      "Five main categories. One living tradition. Men, Women, Kids, Accessories, Home and Living.",
  },
};

export default async function CollectionsPage() {
  const supabase = await createClient();
  const [{ data: dbCollections }, counts] = await Promise.all([
    supabase
      .from("collections")
      .select("*")
      .in("status", ["active", "Active"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    countActiveProductsByCollection(supabase),
  ]);

  const all = (dbCollections || [])
    .map((collection) => ({ ...collection, product_count: counts.byCollection[String(collection.id)] || 0 }))
    .map(normalizeDbCollection);
  const main = all.filter((c) => !c.parentId);
  const byParent: Record<string, typeof all> = {};
  for (const sub of all.filter((c) => c.parentId)) {
    byParent[sub.parentId!] = byParent[sub.parentId!] || [];
    byParent[sub.parentId!].push(sub);
  }

  const mainTotal = counts.total;

  return (
    <>
      {/* ============================================================
          PAGE HERO
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
          <div className="mb-8 opacity-40">
            <PersianMotif motif="geometric" size={56} color="#1D4E89" />
          </div>

          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-xs font-body text-ink-400" role="list">
              <li>
                <a href="/" className="hover:text-lapis-500 transition-colors">Home</a>
              </li>
              <li aria-hidden="true"><span>/</span></li>
              <li aria-current="page">
                <span className="text-ink-500 font-medium">Collections</span>
              </li>
            </ol>
          </nav>

          <h1 className="font-display text-display-lg text-lapis-500 font-semibold mb-4">
            The Collections
          </h1>
          <p
            className="font-persian text-base text-ink-400 mb-4"
            lang="fa"
            dir="rtl"
          >
            مجموعه‌ها
          </p>
          <p className="font-body text-base text-ink-400 max-w-lg leading-relaxed">
            Every collection is a door — Men, Women, Kids, Accessories, or Home and Living — each one opening onto a world of objects rooted in Persian heritage.
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
              { label: "Main categories", value: main.length.toString() },
              { label: "Subcategories", value: (all.length - main.length).toString() },
              { label: "Total pieces",    value: mainTotal.toString() },
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
          MAIN CATEGORIES GRID
          ============================================================ */}
      <section
        id="collections-grid"
        className="py-16 lg:py-20 bg-ivory-200"
        aria-labelledby="grid-heading"
      >
        <div className="container mx-auto">
          <h2 id="grid-heading" className="sr-only">All collections</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {main.map((category) => (
              <article
                key={category.id}
                className={cn(
                  "group relative overflow-hidden rounded-brand-xl",
                  "border-2 border-transparent hover:border-gold-500/60",
                  "bg-ivory-300 shadow-brand-sm hover:shadow-brand-lg",
                  "transition-all duration-300 ease-out",
                )}
              >
                <Link href={`/collections/${category.slug}`} className="block relative aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.coverImage}
                    alt={category.nameEn}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-500/70 via-ink-500/20 to-transparent" aria-hidden="true" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <span className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-400 mb-1">
                      Category
                    </span>
                    <h3 className="font-display text-display-sm text-ivory-200 font-semibold">
                      {category.nameEn}
                    </h3>
                    <p className="font-persian text-base text-ivory-300" lang="fa" dir="rtl">
                      {category.nameFa}
                    </p>
                  </div>
                </Link>

                <div className="p-5">
                  <p className="font-body text-sm text-ink-400 leading-relaxed mb-4">
                    {category.story}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(byParent[category.id] || []).map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/collections/${sub.slug}`}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          "bg-ivory-200 text-ink-500 hover:bg-gold-500/10 hover:text-gold-600",
                          "border border-ivory-400 transition-colors",
                        )}
                      >
                        {sub.nameEn}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {main.length === 0 && (
            <div className="rounded-brand-xl border border-dashed border-ivory-500 bg-ivory-300 px-6 py-16 text-center text-ink-400">
              No collections yet. Create your first collection from the admin panel.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
