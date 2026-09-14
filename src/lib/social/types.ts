import type { SocialCopy } from "@/lib/social/copy";

export const SOCIAL_PLATFORMS = ["instagram", "telegram", "pinterest"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PRODUCT_COLUMNS =
  "id, slug, status, visibility, name_en, name_fa, product_type, price, sale_price, sale_starts_at, sale_ends_at, currency, featured_image_url, gallery_urls, desc_emotional_en, desc_functional_en, desc_story_en, desc_story_fa, seo_keywords";

export type SocialProduct = {
  id: string;
  slug: string;
  status: string;
  visibility: string | null;
  name_en: string;
  name_fa: string;
  product_type: string | null;
  price: number | string;
  sale_price: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  currency: string | null;
  featured_image_url: string | null;
  gallery_urls: string[] | null;
  desc_emotional_en: string | null;
  desc_functional_en: string | null;
  desc_story_en: string | null;
  desc_story_fa: string | null;
  seo_keywords: string[] | null;
};

/** Everything a platform needs to publish one product. */
export type SocialPostInput = {
  product: SocialProduct;
  /** The AI hero scene; Telegram and Pinterest post this one. */
  imageUrl: string;
  /** Ordered Instagram carousel slides, hero first. */
  slides: SocialSlide[];
  copy: SocialCopy;
};

export type SocialSlide = { url: string; alt: string };

export type PublishResult = { externalId: string; externalUrl: string | null };
