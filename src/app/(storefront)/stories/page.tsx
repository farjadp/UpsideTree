// ============================================================================
// File: upside-tree/src/app/stories/page.tsx
// Why: The navbar has promised "Stories" since day one — this makes the
//      link real. Editorial page: the brand manifesto, then one story
//      block per populated collection, each ending in a shop path so the
//      journey continues instead of dead-ending in prose.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { normalizeDbCollection } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "The stories behind Upside Tree — why each collection exists, and the Iranian heritage it carries.",
};

export default async function StoriesPage() {
  const supabase = await createClient();

  const [{ data: dbCollections }, { data: dbProducts }] = await Promise.all([
    supabase.from("collections").select("*").in("status", ["active", "Active"]),
    supabase.from("products").select("collection_id").in("status", ["active", "Active"]),
  ]);

  const counts = (dbProducts ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.collection_id) acc[String(p.collection_id)] = (acc[String(p.collection_id)] || 0) + 1;
    return acc;
  }, {});

  const storyCollections = (dbCollections ?? [])
    .map((c) => ({ ...c, product_count: counts[String(c.id)] || 0 }))
    .map(normalizeDbCollection)
    .filter((c) => c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  return (
    <>
      {/* Manifesto header */}
      <section className="pt-[calc(var(--navbar-height)+5rem)] pb-16" aria-labelledby="stories-heading">
        <div className="container mx-auto">
          <div className="max-w-[640px] mx-auto text-center">
            <div className="flex justify-center mb-8">
              <PersianMotif motif="pomegranate" size={48} color="#1D4E89" opacity={0.6} />
            </div>
            <p
              className="font-persian font-semibold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.9] text-lapis-500 mb-6"
              lang="fa"
              dir="rtl"
            >
              هر شیء، داستانی دارد.
            </p>
            <h1 id="stories-heading" className="font-display text-display-md text-ink-500 font-semibold mb-4">
              Every object carries a story.
            </h1>
            <p className="font-body text-base text-ink-400 leading-relaxed">
              A poem, a motif, a ritual — each collection begins with something real
              from four thousand years of Iranian memory, translated into something
              you carry, wear, or give.
            </p>
          </div>
        </div>
      </section>

      {/* One story block per populated collection */}
      <section className="pb-24" aria-label="Collection stories">
        <div className="container mx-auto flex flex-col gap-16">
          {storyCollections.map((collection, i) => (
            <article
              key={collection.id}
              className={cn(
                "grid md:grid-cols-2 gap-8 md:gap-12 items-center",
              )}
            >
              <div
                className={cn(
                  "relative aspect-[4/3] rounded-brand-xl overflow-hidden bg-ivory-300",
                  i % 2 === 1 && "md:order-2",
                )}
              >
                <Image
                  src={collection.coverImage}
                  alt={collection.nameEn}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className={cn(i % 2 === 1 && "md:order-1")}>
                <p className="font-persian text-lg font-medium text-gold-600 mb-2" lang="fa" dir="rtl" style={{ textAlign: "left" }}>
                  {collection.nameFa}
                </p>
                <h2 className="font-display text-display-sm text-lapis-500 font-semibold mb-4">
                  {collection.nameEn}
                </h2>
                <p className="font-body text-base text-ink-400 leading-relaxed mb-6">
                  {collection.story}
                </p>
                <Link
                  href={`/collections/${collection.slug}`}
                  className={cn(
                    "inline-flex items-center gap-2",
                    "font-body text-sm font-medium text-lapis-500",
                    "hover:text-turquoise-500 transition-colors group",
                  )}
                >
                  Shop {collection.nameEn} ({collection.productCount})
                  <ArrowRight size={14} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Journey continues */}
      <section className="pb-24">
        <div className="container mx-auto text-center">
          <Button href="/collections" variant="primary" size="lg" id="stories-shop-cta" iconRight={<ArrowRight size={18} strokeWidth={2} />}>
            Explore all collections
          </Button>
        </div>
      </section>
    </>
  );
}
