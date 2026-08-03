// ============================================================================
// File: upside-tree/src/components/shop/CollectionCard.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Collection card used on the Collections page and homepage carousel.
//      Each card represents a thematic collection (Roots, Words, Rituals…)
//      NOT an individual product.
//
//      Variants:
//        carousel — For the homepage horizontal scroll-snap strip
//                   Fixed width, portrait orientation
//        grid     — For the /collections page grid layout
//                   Responsive, landscape orientation
//
//      Features:
//        - Collection name as bilingual EN/FA toggle
//        - One-line story in Cormorant Garamond italic
//        - Hover: gold border appears, text slides up 2px
//        - Per-collection accent color on the collection name
//        - Product count badge
// Env / Identity: Frontend (React Client Component — uses BilingualText)
// ============================================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BilingualText } from "@/components/brand/BilingualText";
import { cn } from "@/lib/utils";
import type { StorefrontCollection } from "@/lib/catalog";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type CardVariant = "carousel" | "grid";

interface CollectionCardProps {
  collection: StorefrontCollection;
  variant?:   CardVariant;
  className?: string;
  priority?:  boolean;
}

// ------------------------------------------------------------------
// CollectionCard Component
// ------------------------------------------------------------------

export function CollectionCard({
  collection,
  variant  = "grid",
  className,
  priority = false,
}: CollectionCardProps) {
  const isCarousel = variant === "carousel";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-brand-xl",
        "border-2 border-transparent",
        "hover:border-gold-500/60",
        "transition-all duration-300 ease-out",
        "bg-ivory-300",
        "shadow-brand-sm hover:shadow-brand-lg",
        // Carousel: fixed narrow portrait width
        isCarousel && "w-[260px] sm:w-[300px] shrink-0 aspect-[3/4]",
        // Grid: full width responsive, landscape
        !isCarousel && "w-full aspect-collection",
        className,
      )}
    >
      {/* Cover image */}
      <Image
        src={collection.coverImage}
        alt={`${collection.nameEn} collection`}
        fill
        sizes={
          isCarousel
            ? "(max-width: 640px) 86vw, (max-width: 1024px) 42vw, 420px"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
        quality={95}
        className={cn(
          "object-cover",
          "transition-transform duration-700 ease-out",
          "group-hover:scale-[1.04]",
        )}
        priority={priority}
      />

      {/* Gradient overlay — always visible, deeper on hover */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-t from-ink-500/70 via-ink-500/20 to-transparent",
          "transition-opacity duration-300",
          "group-hover:opacity-90",
        )}
        aria-hidden="true"
      />

      {/* Product count badge */}
      <div
        className="absolute top-4 right-4 z-10"
        aria-label={`${collection.productCount} products`}
      >
        <span
          className={cn(
            "px-2.5 py-1 rounded-sm",
            "text-[10px] font-body font-semibold tracking-widest uppercase",
            "bg-ivory-200/80 backdrop-blur-sm",
            "text-ink-500",
          )}
        >
          {collection.productCount} pieces
        </span>
      </div>

      {/* Content — sits at bottom of card */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10",
          "p-5 sm:p-6",
          "flex flex-col gap-2",
          // Hover: content shifts up slightly
          "transition-transform duration-300",
          "group-hover:-translate-y-1",
        )}
      >
        {/* Collection name — bilingual */}
        <BilingualText
          en={
            <h2
              className={cn(
                "font-display font-semibold text-ivory-200",
                "leading-tight",
                isCarousel ? "text-2xl" : "text-xl sm:text-2xl",
              )}
            >
              {collection.nameEn}
            </h2>
          }
          fa={
            <h2
              className={cn(
                "font-persian font-medium text-ivory-200",
                "leading-tight",
                isCarousel ? "text-2xl" : "text-xl sm:text-2xl",
              )}
            >
              {collection.nameFa}
            </h2>
          }
          textClassName="mb-0"
        />

        {/* One-line story */}
        <p
          className={cn(
            "font-display italic text-ivory-300/90",
            "leading-snug line-clamp-2",
            isCarousel ? "text-sm" : "text-sm sm:text-base",
          )}
        >
          {collection.story}
        </p>

        {/* Explore CTA — slides in from bottom on hover */}
        <div
          className={cn(
            "flex items-center gap-1.5 mt-1",
            "text-gold-400 text-sm font-body font-medium",
            "opacity-0 group-hover:opacity-100",
            "translate-y-3 group-hover:translate-y-0",
            "transition-all duration-300",
          )}
          aria-hidden="true"
        >
          Explore collection
          <ArrowRight size={14} strokeWidth={2} />
        </div>
      </div>

      {/* Full-card click target — accessible link */}
      <Link
        href={`/collections/${collection.slug}`}
        id={`collection-card-${collection.id}`}
        className={cn(
          "absolute inset-0 z-20",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-gold-500",
          "focus-visible:ring-inset rounded-brand-xl",
        )}
        aria-label={`Explore the ${collection.nameEn} collection — ${collection.story}`}
      >
        <span className="sr-only">
          Explore {collection.nameEn} ({collection.productCount} products)
        </span>
      </Link>
    </article>
  );
}
