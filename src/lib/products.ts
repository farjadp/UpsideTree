type ProductLike = {
  slug?: string | null;
  featured_image_url?: string | null;
  images?: string[] | null;
  stock_quantity?: number | null;
  stock_level?: number | null;
  status?: string | null;
  description_en?: string | null;
  desc_emotional?: string | null;
  collections?: {
    name_en?: string | null;
    name_fa?: string | null;
    slug?: string | null;
  } | null;
};

export function getProductImages(product: ProductLike) {
  if (product.images && product.images.length > 0) {
    return product.images;
  }

  if (product.featured_image_url) {
    return [product.featured_image_url];
  }

  return ["/images/placeholder.jpg"];
}

export function normalizeProductStatus(status?: string | null) {
  return (status || "draft").toLowerCase();
}

export function getProductStock(product: ProductLike) {
  return product.stock_quantity ?? product.stock_level ?? 0;
}

export function getProductHeadline(product: ProductLike) {
  return product.desc_emotional || product.description_en || "";
}

export function getProductCollection(product: ProductLike) {
  return (
    product.collections || {
      name_en: "Words",
      name_fa: "واژه‌ها",
      slug: "words",
    }
  );
}
