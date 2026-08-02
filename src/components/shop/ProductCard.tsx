// ============================================================================
// File: upside-tree/src/components/shop/ProductCard.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Product card used in grids, carousels, and featured sections.
//
//      Renders the 3-layer product description system (per brand spec):
//        Layer 1 — Emotional headline (shown on card)
//        Layer 2 — Functional description (shown in Quick View / product page)
//        Layer 3 — Story/inspiration (shown on product page)
//
//      Variants:
//        default  — Standard grid card (image 3/4 aspect ratio)
//        featured — Larger, shows emotional headline prominently
//        compact  — Horizontal layout for cart/sidebar
//
//      Features:
//        - Bilingual name toggle (EN/FA)
//        - Quick View hover overlay (links to product page)
//        - Badge display (Bestseller, Limited, New, etc.)
//        - Low stock warning
//        - Price with optional sale price strikethrough
//        - Add to cart (Phase 2: wired to cart context)
// Env / Identity: Frontend (React Client Component)
// ============================================================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Eye } from "lucide-react";
import { BilingualText } from "@/components/brand/BilingualText";
import { Button } from "@/components/ui/Button";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/mock/products";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type CardVariant = "default" | "featured" | "compact";

interface ProductCardProps {
  product:    Product;
  variant?:   CardVariant;
  className?: string;
  /** Priority image loading (above fold) */
  priority?:  boolean;
}

// ------------------------------------------------------------------
// Badge Component
// ------------------------------------------------------------------

function ProductBadge({ text }: { text: string }) {
  // Badge color mapping
  const badgeColors: Record<string, string> = {
    "Bestseller": "bg-lapis-500 text-white",
    "Limited":    "bg-pomegranate-500 text-white",
    "New":        "bg-turquoise-500 text-white",
    "Nowruz":     "bg-gold-500 text-ink-500",
    "Yalda":      "bg-lapis-700 text-white",
    "One of a kind": "bg-gold-600 text-white",
    "default":    "bg-ink-500 text-white",
  };

  const colorClass = badgeColors[text] ?? badgeColors["default"];

  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5",
        "text-[10px] font-body font-semibold tracking-wide",
        "rounded-sm",
        colorClass,
      )}
    >
      {text}
    </span>
  );
}

// ------------------------------------------------------------------
// ProductCard Component
// ------------------------------------------------------------------

export function ProductCard({
  product,
  variant  = "default",
  className,
  priority = false,
}: ProductCardProps) {
  const primaryImage = product.images[0] ?? "/images/placeholder.png";
  const isOnSale     = !!product.originalPrice && product.originalPrice > product.price;
  const isLowStock   =
    product.inventory === "limited" &&
    !!product.stock &&
    !!product.lowStockThreshold &&
    product.stock <= product.lowStockThreshold;

  // ----------------------------------------------------------------
  // COMPACT variant — horizontal layout
  // ----------------------------------------------------------------
  if (variant === "compact") {
    return (
      <article
        className={cn(
          "flex gap-4 py-4 border-b border-ivory-400",
          "group",
          className,
        )}
      >
        {/* Thumbnail */}
        <Link
          href={`/products/${product.slug}`}
          className="shrink-0 w-20 h-20 rounded-brand overflow-hidden bg-ivory-300"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={primaryImage}
            alt={product.nameEn}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <BilingualText
            en={<span className="text-sm font-body font-medium text-ink-500">{product.nameEn}</span>}
            fa={<span className="text-sm font-persian text-ink-500">{product.nameFa}</span>}
            textClassName="mb-1"
          />
          <p className="text-sm text-ink-400 font-body">
            {formatPrice(product.price, product.currency)}
          </p>
        </div>
      </article>
    );
  }

  // ----------------------------------------------------------------
  // DEFAULT + FEATURED variants — vertical card
  // ----------------------------------------------------------------
  return (
    <article
      className={cn(
        "group relative flex flex-col",
        "rounded-brand-lg overflow-hidden",
        "bg-ivory-200",
        "transition-shadow duration-300",
        "hover:shadow-brand-lg",
        className,
      )}
    >
      {/* Image container */}
      <div
        className={cn(
          "relative overflow-hidden bg-ivory-300",
          variant === "featured" ? "aspect-[4/3]" : "aspect-product",
        )}
      >
        <Image
          src={primaryImage}
          alt={product.nameEn}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={cn(
            "object-cover",
            "transition-transform duration-500 ease-out",
            "group-hover:scale-105",
          )}
          priority={priority}
        />

        {/* Hover overlay — Quick View */}
        <div
          className={cn(
            "absolute inset-0",
            "flex items-end justify-center",
            "pb-4 px-4",
            "bg-gradient-to-t from-ink-500/30 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-300",
          )}
        >
          <Link
            href={`/products/${product.slug}`}
            id={`product-quickview-${product.id}`}
            className={cn(
              "flex items-center gap-2",
              "px-4 py-2 rounded-brand",
              "bg-ivory-200/90 backdrop-blur-sm",
              "text-lapis-500 text-sm font-body font-medium",
              "hover:bg-ivory-200 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis-500",
              "translate-y-2 group-hover:translate-y-0",
              "transition-transform duration-300",
            )}
            aria-label={`Quick view ${product.nameEn}`}
          >
            <Eye size={14} strokeWidth={1.75} />
            View product
          </Link>
        </div>

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 z-10">
            <ProductBadge text={product.badge} />
          </div>
        )}

        {/* Low stock warning */}
        {isLowStock && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-block px-2 py-0.5 bg-gold-500/90 text-ink-500 text-[10px] font-body font-semibold rounded-sm">
              Only {product.stock} left
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className={cn(
        "flex flex-col flex-1 p-4",
        variant === "featured" && "p-6",
      )}>

        {/* Collection label */}
        <span className="text-[10px] font-body font-semibold tracking-widest text-gold-500 uppercase mb-2">
          {product.collectionSlug.replace(/-/g, " ")}
        </span>

        {/* Product name — bilingual */}
        <BilingualText
          en={
            <h3 className={cn(
              "font-display font-semibold text-ink-500 leading-snug",
              variant === "featured" ? "text-xl" : "text-base",
            )}>
              {product.nameEn}
            </h3>
          }
          fa={
            <h3 className={cn(
              "font-persian font-medium text-ink-500 leading-snug",
              variant === "featured" ? "text-xl" : "text-base",
            )}>
              {product.nameFa}
            </h3>
          }
          className="mb-2"
        />

        {/* Emotional headline — visible on featured variant */}
        {variant === "featured" && (
          <p className="text-sm text-ink-400 font-body italic leading-relaxed mb-4 line-clamp-2">
            {product.emotionalHeadline}
          </p>
        )}

        {/* Spacer to push price+CTA to bottom */}
        <div className="flex-1" />

        {/* Price row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-body font-semibold text-ink-500">
              {formatPrice(product.price, product.currency)}
            </span>
            {isOnSale && product.originalPrice && (
              <span className="text-sm text-ink-300 line-through font-body">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
          </div>

          {/* Add to cart — Phase 2: wired to real cart */}
          <button
            id={`add-to-cart-${product.id}`}
            aria-label={`Add ${product.nameEn} to cart`}
            onClick={() => {
              // Phase 2: dispatch addToCart(product) action
              console.info("[Cart] Phase 2: add to cart →", product.slug);
            }}
            className={cn(
              "p-2 rounded-brand",
              "text-pomegranate-500 hover:bg-pomegranate-50",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pomegranate-500",
            )}
          >
            <ShoppingBag size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Featured: full CTA button */}
        {variant === "featured" && (
          <Button
            href={`/products/${product.slug}`}
            variant="primary"
            size="md"
            className="w-full mt-4"
          >
            Shop now
          </Button>
        )}
      </div>
    </article>
  );
}
