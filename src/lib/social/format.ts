import "server-only";

import type { SocialPlatform, SocialProduct } from "@/lib/social/types";

export function siteUrl() {
  const url = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/+$/, "");
  if (!url || url.includes("localhost")) throw new Error("NEXT_PUBLIC_SITE_URL must be set to the public store URL.");
  return url;
}

/** Product page link, tagged so each platform's traffic shows up separately in analytics. */
export function productLink(product: SocialProduct, platform: SocialPlatform) {
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: "product_autopost",
    utm_content: product.slug,
  });
  return `${siteUrl()}/products/${product.slug}?${params}`;
}

/** Short display form for places a link can't be clicked (Instagram captions). */
export function displayLink(product: SocialProduct) {
  return `${siteUrl().replace(/^https?:\/\//, "")}/products/${product.slug}`;
}

export function priceLine(product: SocialProduct) {
  const now = Date.now();
  const saleActive =
    product.sale_price != null &&
    Number(product.sale_price) > 0 &&
    (!product.sale_starts_at || new Date(product.sale_starts_at).getTime() <= now) &&
    (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
  const amount = Number(saleActive ? product.sale_price : product.price);
  if (!amount) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: product.currency || "CAD" }).format(amount);
}

export function hashtags(tags: string[], max: number) {
  const clean = tags
    .map((tag) => tag.replace(/^#+/, "").replace(/\s+/g, "_").trim())
    .filter(Boolean);
  return [...new Set(clean)].slice(0, max).map((tag) => `#${tag}`).join(" ");
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
