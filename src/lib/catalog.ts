import { getProductCollection, getProductHeadline, getProductImages, getProductStock } from "@/lib/products";

export type StorefrontProduct = {
  id: string;
  slug: string;
  collectionSlug: string;
  nameEn: string;
  nameFa: string;
  emotionalHeadline?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  images: string[];
  sku?: string;
  stock?: number;
  lowStockThreshold?: number;
  inventory?: "limited" | "unlimited";
  badge?: string;
};

export type StorefrontCollection = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  story: string;
  storyFa: string;
  coverImage: string;
  featured: boolean;
  productCount: number;
};

export function normalizeDbProduct(product: any): StorefrontProduct {
  const collection = getProductCollection(product);
  const stock = getProductStock(product);

  return {
    id: String(product.id),
    slug: product.slug,
    collectionSlug: collection.slug || "uncategorized",
    nameEn: product.name_en || "Untitled Product",
    nameFa: product.name_fa || "",
    emotionalHeadline: getProductHeadline(product),
    price: Number(product.price || 0),
    originalPrice: product.sale_price ? Number(product.sale_price) : undefined,
    currency: product.currency || "CAD",
    images: getProductImages(product),
    sku: product.sku || undefined,
    stock,
    lowStockThreshold: product.low_stock_threshold || 5,
    inventory: stock > 0 ? "limited" : "unlimited",
    badge: product.featured ? "Featured" : undefined,
  };
}

export function normalizeDbCollection(collection: any): StorefrontCollection {
  return {
    id: String(collection.id),
    slug: collection.slug,
    nameEn: collection.name_en || "Untitled Collection",
    nameFa: collection.name_fa || "",
    story: collection.story_en || collection.description_en || "A collection waiting for its first story.",
    storyFa: collection.story_fa || collection.description_fa || "مجموعه‌ای که هنوز داستان خود را کامل نکرده است.",
    coverImage: collection.cover_image_url || collection.banner_image_url || "/images/placeholder.jpg",
    featured: Boolean(collection.featured),
    productCount: collection.products?.[0]?.count ?? collection.product_count ?? 0,
  };
}
