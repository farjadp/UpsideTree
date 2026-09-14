import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { recordProductView } from "@/lib/product-views";
import { Breadcrumb } from "@/components/product/Breadcrumb";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductActions } from "@/components/product/ProductActions";
import { PinterestProductView } from "@/components/analytics/PinterestTag";
import { TrustSignals } from "@/components/product/TrustSignals";
import { DescriptionTabs } from "@/components/product/DescriptionTabs";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { CollectionBanner } from "@/components/product/CollectionBanner";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { StickyMobileCartBar } from "@/components/product/StickyMobileCartBar";
import {
  getProductHeadline,
  getProductImages,
  getPriceRange,
  getProductStock,
  getVariantPrice,
  isProductPurchasable,
  normalizeProductStatus,
  slugifyProduct,
} from "@/lib/products";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const columns = "name_en, seo_title_en, seo_description_en, desc_emotional_en, featured_image_url";

  let { data: product } = await supabase
    .from("products")
    .select(columns)
    .in("status", ["active", "Active"])
    .eq("slug", slug)
    .maybeSingle();
  if (!product) {
    ({ data: product } = await supabase
      .from("products")
      .select(columns)
      .in("status", ["active", "Active"])
      .eq("slug", slugifyProduct(decodeURIComponent(slug)))
      .maybeSingle());
  }
  if (!product) return { title: "Product not found" };

  // The root layout's "%s | Upside Tree" template adds the brand suffix.
  const title = product.seo_title_en?.trim() || product.name_en;
  const description = product.seo_description_en?.trim() || product.desc_emotional_en?.trim() || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.featured_image_url ? [{ url: product.featured_image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = slugifyProduct(decodeURIComponent(slug));
  const supabase = await createClient();
  const { data: userSession } = await supabase.auth.getUser();

  // 1. PRIMARY FETCH — the products.slug column is unique, so a direct
  // lookup is enough; the normalized fallback only matters for links typed
  // with different casing/punctuation than the stored slug.
  let dbProduct: any = null;
  const { data: exactMatch } = await supabase
    .from('products')
    .select("*")
    .in("status", ["active", "Active"])
    .eq("slug", slug)
    .maybeSingle();

  dbProduct = exactMatch;

  if (!dbProduct && normalizedSlug !== slug) {
    const { data: normalizedMatch } = await supabase
      .from('products')
      .select("*")
      .in("status", ["active", "Active"])
      .eq("slug", normalizedSlug)
      .maybeSingle();
    dbProduct = normalizedMatch;
  }

  if (!dbProduct) {
    notFound();
  }

  // Counted, not awaited — feeds the homepage "Most Viewed" ranking.
  recordProductView(dbProduct.id);

  const [{ data: dbVariants }, { data: dbCollection }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, sku, name_en, name_fa, attributes, price, sale_price, stock_quantity, image_url, is_default')
      .eq('product_id', dbProduct.id),
    dbProduct.collection_id
      ? supabase.from('collections').select('*').eq('id', dbProduct.collection_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const product: any = {
    ...dbProduct,
    // No placeholder collection: a product without one simply has no
    // collection badge, banner or "More from" rail.
    collections: dbCollection || null,
    product_variants: dbVariants || [],
    status: normalizeProductStatus(dbProduct.status),
    stock_quantity: getProductStock(dbProduct),
    desc_emotional: getProductHeadline(dbProduct),
    desc_functional_en: dbProduct.desc_functional_en || dbProduct.description_en || "",
    desc_story: dbProduct.desc_story_en || dbProduct.story_en || "",
    featured_image_url: dbProduct.featured_image_url || getProductImages(dbProduct)[0],
    images: getProductImages(dbProduct),
  };

  // 2. SECONDARY FETCHES: Reviews, Related, Wishlist
  const [
    { data: dbRelated },
    { data: dbReviews },
    { data: dbWishlist },
    { data: dbRatings }
  ] = await Promise.all([
    product.collection_id
      ? supabase
          .from('products')
          .select('*, collections(name_en, name_fa)')
          .eq('collection_id', product.collection_id)
          .neq('id', product.id)
          .in('status', ['active', 'Active'])
          .limit(4)
      : Promise.resolve({ data: [] }),

    supabase
      .from('customer_reviews')
      .select('id, rating, title, body, created_at, verified_purchase, photos, helpful_count')
      .eq('product_id', product.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(6),

    userSession.user ? supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userSession.user.id)
      .eq('product_id', product.id)
      .single() : Promise.resolve({ data: null }),

    // Ratings only (not the 6-review page above) so the average and star
    // breakdown cover every approved review.
    supabase
      .from('customer_reviews')
      .select('rating')
      .eq('product_id', product.id)
      .eq('status', 'approved')
  ]);

  const relatedProducts = dbRelated || [];
  // customer_reviews has no reviewer name/location columns (asking for
  // them made PostgREST reject the query, so reviews never rendered), and
  // anonymous visitors can't read customer_profiles under RLS.
  const reviews = (dbReviews || []).map((review) => ({
    ...review,
    reviewer_name: review.verified_purchase ? 'Verified buyer' : 'Customer',
    is_verified: Boolean(review.verified_purchase),
  }));
  const isWishlisted = !!dbWishlist;
  const ratings = (dbRatings || [])
    .map((row: { rating: number | null }) => Number(row.rating))
    .filter((rating: number) => rating >= 1 && rating <= 5);
  const stars: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const rating of ratings) stars[Math.round(rating) as 1 | 2 | 3 | 4 | 5] += 1;
  const reviewStats = {
    avg: ratings.length ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 : 0,
    count: ratings.length,
    stars,
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  const purchasable = isProductPurchasable(product);
  const priceRange = getPriceRange(product, product.product_variants);
  product.price_min = priceRange.min;
  product.price_max = priceRange.max;
  // One price across every option: show it (with any sale) as-is.
  const singlePrice = priceRange.min === priceRange.max
    ? getVariantPrice(product, product.product_variants[0])
    : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-20 pt-24">
      {/* JSON-LD STRUCTURED DATA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name_en,
            "image": product.images || [product.featured_image_url],
            "description": product.desc_emotional || product.name_en,
            "sku": product.product_variants?.[0]?.sku || product.id,
            "offers": {
              "@type": "Offer",
              ...(siteUrl ? { "url": `${siteUrl}/products/${product.slug}` } : {}),
              "priceCurrency": "CAD",
              "price": priceRange.min,
              "availability": purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            // Google rejects an AggregateRating with zero reviews.
            ...(reviewStats.count > 0 ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": reviewStats.avg,
                "reviewCount": reviewStats.count
              }
            } : {})
          })
        }}
      />

      <PinterestProductView productId={product.id} name={product.name_en} price={Number(priceRange.min) || 0} />

      <div className="container mx-auto px-4 max-w-[1280px]">
        {/* BREADCRUMB */}
        <Breadcrumb
          collection={product.collections}
          product={{ name_en: product.name_en, name_fa: product.name_fa }}
        />

        {/* 2-COLUMN MAIN PRODUCT SECTION */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">

          {/* LEFT COLUMN: GALLERY (55% desktop) */}
          <div className="w-full lg:w-[55%] relative">
            <ProductGallery images={product.images} altText={product.name_en} />
          </div>

          {/* RIGHT COLUMN: INFO (45% desktop) */}
          <div className="w-full lg:w-[45%] lg:sticky lg:top-32 pb-12">
            <ProductInfo product={product} reviewStats={reviewStats} />
            <ProductActions product={product} isWishlistedInitially={isWishlisted} />
            <TrustSignals />
          </div>

        </div>

        {/* DESCRIPTION TABS (Full width, below 2-column) */}
        <DescriptionTabs product={product} />

        {/* REVIEWS SECTION */}
        <ReviewsSection
          productId={product.id}
          initialReviews={reviews}
          stats={reviewStats}
        />
      </div>

      {product.collections && (
        <>
          {/* COLLECTION BANNER */}
          <CollectionBanner collection={product.collections} />

          {/* RELATED PRODUCTS */}
          <RelatedProducts
            products={relatedProducts}
            collectionNameEn={product.collections.name_en}
            collectionNameFa={product.collections.name_fa}
          />
        </>
      )}

      {/* RECENTLY VIEWED */}
      <RecentlyViewed currentProduct={{
        id: product.id,
        name_en: product.name_en,
        name_fa: product.name_fa,
        slug: product.slug,
        price: product.price,
        featured_image_url: product.featured_image_url || product.images?.[0]
      }} />

      {/* STICKY MOBILE CART BAR */}
      <StickyMobileCartBar
        productNameEn={product.name_en}
        productNameFa={product.name_fa}
        price={singlePrice ? singlePrice.price : priceRange.min}
        salePrice={singlePrice?.salePrice ?? undefined}
        isOutOfStock={!purchasable}
      />
    </div>
  );
}
