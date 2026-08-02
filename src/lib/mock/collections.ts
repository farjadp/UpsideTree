// ============================================================================
// File: upside-tree/src/lib/mock/collections.ts
// Version: 1.0.0 — 2026-08-01
// Why: Mock data for the 5 Upside Tree collections. This file is the source
//      of truth for collection metadata during Phase 1 (no backend).
//      In Phase 2, this is replaced by Supabase queries via the collection
//      service layer. Keep the data shape consistent with the planned
//      Supabase `collections` table schema to minimize migration effort.
//
//      Collection Structure:
//        - id / slug: used for routing /collections/[slug]
//        - nameEn / nameFa: bilingual display names
//        - story: one-sentence editorial description (EN)
//        - storyFa: same in Farsi (RTL)
//        - coverImage: local /public/images/ path
//        - accentColor: per-collection accent (within brand palette)
//        - productCount: displayed on collection card
// Env / Identity: Frontend (shared data layer)
// ============================================================================

/**
 * Represents a single Upside Tree collection (product group).
 * Phase 2: maps to Supabase `collections` table row.
 */
export interface Collection {
  id:           string;
  slug:         string;
  nameEn:       string;
  nameFa:       string;
  story:        string;      // One-sentence editorial description (EN)
  storyFa:      string;      // Same in Farsi
  coverImage:   string;      // Public path or URL
  accentColor:  string;      // CSS hex — per-collection highlight
  productCount: number;
  featured:     boolean;     // Show in homepage featured strip
  order:        number;      // Display order on collections page
}

// ------------------------------------------------------------------
// The 5 Collections
// ------------------------------------------------------------------
export const collections: Collection[] = [
  {
    id:           "col-roots",
    slug:         "roots",
    nameEn:       "Roots",
    nameFa:       "ریشه‌ها",
    story:        "Geometric symbols, cypress trees, and pomegranate motifs — the visual language of four thousand years.",
    storyFa:      "نمادهای هندسی، درختان سرو و نقوش انار — زبان بصری چهار هزار سال تاریخ.",
    coverImage:   "/images/product-tote-roots.png",
    accentColor:  "#1D4E89", // Lapis — anchored, deep
    productCount: 8,
    featured:     true,
    order:        1,
  },
  {
    id:           "col-words",
    slug:         "words",
    nameEn:       "Words",
    nameFa:       "کلمات",
    story:        "Persian poetry and calligraphy made wearable — a verse you carry into the world every day.",
    storyFa:      "شعر و خوشنویسی فارسی که می‌توان پوشید — بیتی که هر روز با خود به دنیا می‌بری.",
    coverImage:   "/images/product-poetry-print.png",
    accentColor:  "#18231F", // Ink — literary, precise
    productCount: 6,
    featured:     true,
    order:        2,
  },
  {
    id:           "col-rituals",
    slug:         "rituals",
    nameEn:       "Rituals",
    nameFa:       "آیین‌ها",
    story:        "Nowruz, Yalda, and the quiet ceremony of chai — objects that mark time the Iranian way.",
    storyFa:      "نوروز، شب یلدا و مراسم آرام چای — اشیایی که زمان را به شیوه ایرانی نشانه می‌گذارند.",
    coverImage:   "/images/collection-rituals-tea.png",
    accentColor:  "#1F8A8A", // Turquoise — ceremonial, warm
    productCount: 7,
    featured:     true,
    order:        3,
  },
  {
    id:           "col-made-by-hand",
    slug:         "made-by-hand",
    nameEn:       "Made by Hand",
    nameFa:       "دست‌ساز",
    story:        "Artist collaborations and limited handmade pieces — where the maker's touch is part of the story.",
    storyFa:      "همکاری با هنرمندان و قطعات محدود دست‌ساز — جایی که لمس سازنده بخشی از داستان است.",
    coverImage:   "/images/product-mug-pomegranate.png",
    accentColor:  "#B48635", // Gold — artisanal, precious
    productCount: 4,
    featured:     false,
    order:        4,
  },
  {
    id:           "col-limited-stories",
    slug:         "limited-stories",
    nameEn:       "Limited Stories",
    nameFa:       "داستان‌های محدود",
    story:        "Numbered editions and art objects — for those who collect meaning as much as beauty.",
    storyFa:      "نسخه‌های شماره‌دار و آثار هنری — برای کسانی که معنا را به اندازه زیبایی جمع‌آوری می‌کنند.",
    coverImage:   "/images/product-poetry-print.png",
    accentColor:  "#8C2F39", // Pomegranate — rare, significant
    productCount: 3,
    featured:     false,
    order:        5,
  },
];

// ------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------

/**
 * Find a collection by its URL slug.
 * Returns undefined if not found (caller should handle 404).
 */
export function getCollectionBySlug(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

/**
 * Return collections shown on the homepage featured strip.
 * Ordered by `order` field ascending.
 */
export function getFeaturedCollections(): Collection[] {
  return collections
    .filter((c) => c.featured)
    .sort((a, b) => a.order - b.order);
}

/**
 * Return all collections sorted by display order.
 */
export function getAllCollections(): Collection[] {
  return [...collections].sort((a, b) => a.order - b.order);
}
