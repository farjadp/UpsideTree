type ProductLike = {
  slug?: string | null;
  featured_image_url?: string | null;
  images?: string[] | null;
  gallery_urls?: string[] | null;
  stock_quantity?: number | null;
  stock_level?: number | null;
  manage_stock?: boolean | null;
  status?: string | null;
  description_en?: string | null;
  desc_emotional?: string | null;
  desc_emotional_en?: string | null;
  desc_functional_en?: string | null;
  collections?: {
    name_en?: string | null;
    name_fa?: string | null;
    slug?: string | null;
  } | null;
};

export function slugifyProduct(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export function getProductImages(product: ProductLike) {
  if (product.images && product.images.length > 0) {
    return product.images;
  }

  if (product.featured_image_url) {
    return [product.featured_image_url, ...(product.gallery_urls || [])];
  }

  if (product.gallery_urls && product.gallery_urls.length > 0) {
    return product.gallery_urls;
  }

  return ["/images/placeholder.jpg"];
}

export function normalizeProductStatus(status?: string | null) {
  return (status || "draft").toLowerCase();
}

// Print-on-demand products (manage_stock = false) have no finite stock:
// Printify variants carry a null stock_quantity, which must mean
// "unlimited", not "zero left".
export function isStockTracked(product: Pick<ProductLike, "manage_stock">) {
  return product.manage_stock !== false;
}

export function isProductPurchasable(product: ProductLike) {
  if (normalizeProductStatus(product.status) !== "active") return false;
  return !isStockTracked(product) || getProductStock(product) > 0;
}

type PricedVariant = { price?: number | string | null; sale_price?: number | string | null };

// What a shopper pays for a variant: its own price when set, otherwise the
// product's. Mirrors the server-side rule in /api/checkout.
export function getVariantPrice(
  product: { price?: number | string | null; sale_price?: number | string | null },
  variant?: PricedVariant | null
) {
  const sale = variant?.sale_price ?? (variant?.price == null ? product.sale_price : null);
  const price = Number(variant?.price ?? product.price ?? 0);
  return { price, salePrice: sale != null && Number(sale) > 0 ? Number(sale) : null };
}

export function getPriceRange(
  product: { price?: number | string | null; sale_price?: number | string | null },
  variants: PricedVariant[]
) {
  const effective = (variants.length ? variants : [null]).map((variant) => {
    const { price, salePrice } = getVariantPrice(product, variant);
    return salePrice ?? price;
  });
  return { min: Math.min(...effective), max: Math.max(...effective) };
}

export function getProductStock(product: ProductLike) {
  return product.stock_quantity ?? product.stock_level ?? 0;
}

// The one-line emotional headline only. It used to fall back to the full
// product description, which put Printify's long spec text in italics under
// the title.
export function getProductHeadline(product: ProductLike) {
  return product.desc_emotional_en || product.desc_emotional || "";
}
