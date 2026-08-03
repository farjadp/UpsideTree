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
  {
    id:           "col-tshirts",
    slug:         "t-shirts",
    nameEn:       "T-shirts",
    nameFa:       "تی‌شرت‌ها",
    story:        "Everyday wearable art infused with ancient Persian motifs.",
    storyFa:      "هنر پوشیدنی روزمره، درآمیخته با نقوش باستانی ایران.",
    coverImage:   "/images/category-tshirts.png",
    accentColor:  "#1D4E89",
    productCount: 15,
    featured:     false,
    order:        6,
  },
  {
    id:           "col-sweatshirt",
    slug:         "sweatshirts",
    nameEn:       "Sweatshirts",
    nameFa:       "سوییشرت‌ها",
    story:        "Warm, premium layers wrapped in the elegance of Persian heritage.",
    storyFa:      "لایه‌های گرم و پریمیوم در حصار شکوه میراث ایرانی.",
    coverImage:   "/images/category-sweatshirt.png",
    accentColor:  "#8C2F39",
    productCount: 12,
    featured:     false,
    order:        7,
  },
  {
    id:           "col-mugs",
    slug:         "mugs",
    nameEn:       "Mugs",
    nameFa:       "ماگ‌ها",
    story:        "Ceramic vessels bringing the warmth of Persian hospitality to your daily chai.",
    storyFa:      "ظروف سرامیکی برای آوردن گرمای مهمان‌نوازی ایرانی به چای روزانه شما.",
    coverImage:   "/images/category-mugs.png",
    accentColor:  "#B48635",
    productCount: 20,
    featured:     true,
    order:        8,
  },
  {
    id:           "col-hoodie",
    slug:         "hoodies",
    nameEn:       "Hoodies",
    nameFa:       "هودی‌ها",
    story:        "Modern comfort meets timeless calligraphy and geometric perfection.",
    storyFa:      "راحتی مدرن در کنار کمال هندسی و خطاطی جاودانه.",
    coverImage:   "/images/category-hoodie.png",
    accentColor:  "#1F8A8A",
    productCount: 10,
    featured:     false,
    order:        9,
  },
  {
    id:           "col-kids",
    slug:         "kids-clothing",
    nameEn:       "Kids Clothing",
    nameFa:       "لباس کودک",
    story:        "Passing down the stories of Shahnameh to the next generation.",
    storyFa:      "انتقال داستان‌های شاهنامه به نسل آینده.",
    coverImage:   "/images/category-kids.png",
    accentColor:  "#1D4E89",
    productCount: 18,
    featured:     false,
    order:        10,
  },
  {
    id:           "col-stickers",
    slug:         "stickers",
    nameEn:       "Stickers",
    nameFa:       "استیکرها",
    story:        "Small pieces of art to carry Persian culture wherever you go.",
    storyFa:      "قطعات کوچک هنری برای همراه داشتن فرهنگ ایرانی در هر جا.",
    coverImage:   "/images/category-stickers.png",
    accentColor:  "#18231F",
    productCount: 35,
    featured:     false,
    order:        11,
  },
  {
    id:           "col-phonecases",
    slug:         "phone-cases",
    nameEn:       "Phone Cases",
    nameFa:       "قاب گوشی",
    story:        "Protect your technology with the resilience of ancient architecture.",
    storyFa:      "محافظت از تکنولوژی با اصالت معماری باستانی.",
    coverImage:   "/images/category-phonecases.png",
    accentColor:  "#B48635",
    productCount: 24,
    featured:     false,
    order:        12,
  },
  {
    id:           "col-posters",
    slug:         "posters",
    nameEn:       "Posters",
    nameFa:       "پوسترها",
    story:        "Turn your walls into a gallery of Iranian history and poetry.",
    storyFa:      "دیوارهای خود را به گالری تاریخ و شعر ایران تبدیل کنید.",
    coverImage:   "/images/category-posters.png",
    accentColor:  "#8C2F39",
    productCount: 40,
    featured:     true,
    order:        13,
  },
  {
    id:           "col-candles",
    slug:         "candles",
    nameEn:       "Candles",
    nameFa:       "شمع‌ها",
    story:        "Illuminate your space with the glowing aromas of a Persian garden.",
    storyFa:      "فضای خود را با رایحه درخشان یک باغ ایرانی روشن کنید.",
    coverImage:   "/images/category-candles.png",
    accentColor:  "#1F8A8A",
    productCount: 8,
    featured:     false,
    order:        14,
  },
  {
    id:           "col-bags",
    slug:         "bags",
    nameEn:       "Bags",
    nameFa:       "کیف‌ها",
    story:        "Carry your world in bags woven with the spirit of the Silk Road.",
    storyFa:      "دنیای خود را در کیف‌هایی با روح جاده ابریشم حمل کنید.",
    coverImage:   "/images/category-bags.png",
    accentColor:  "#1D4E89",
    productCount: 14,
    featured:     false,
    order:        15,
  }
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
