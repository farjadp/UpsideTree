import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/product/Breadcrumb";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductActions } from "@/components/product/ProductActions";
import { TrustSignals } from "@/components/product/TrustSignals";
import { DescriptionTabs } from "@/components/product/DescriptionTabs";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { CollectionBanner } from "@/components/product/CollectionBanner";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { StickyMobileCartBar } from "@/components/product/StickyMobileCartBar";
import {
  getProductCollection,
  getProductHeadline,
  getProductImages,
  getProductStock,
  normalizeProductStatus,
} from "@/lib/products";
import { applyProductMetadata, getProductMetadataMap, slugifyProduct } from "@/lib/product-metadata";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = slugifyProduct(decodeURIComponent(slug));
  const supabase = await createClient();
  const { data: userSession } = await supabase.auth.getUser();

  // 1. PRIMARY FETCH: Keep this query resilient. A broken relation should not 404 the product page.
  let product: any = null;
  const productMetadata = await getProductMetadataMap();
  const { data: dbProducts } = await supabase
    .from('products')
    .select("*, collections ( id, name_en, name_fa, slug, story_en, story_fa )")
    .in("status", ["active", "Active"]);

  const mergedProducts = applyProductMetadata(dbProducts || [], productMetadata);
  const dbProduct = mergedProducts.find((item) => {
    const itemSlug = String(item.slug || "");
    return itemSlug === slug || slugifyProduct(itemSlug) === normalizedSlug;
  });

  if (dbProduct) {
    const { data: dbVariants } = await supabase
      .from('product_variants')
      .select('id, sku, name_en, name_fa, attributes, price, sale_price, stock_quantity, image_url, is_default')
      .eq('product_id', dbProduct.id);

    product = {
      ...dbProduct,
      product_variants: dbVariants || [],
      status: normalizeProductStatus(dbProduct.status),
      stock_quantity: getProductStock(dbProduct),
      desc_emotional: getProductHeadline(dbProduct),
      desc_functional_en: dbProduct.desc_functional_en || dbProduct.description_en || "",
      desc_story: dbProduct.desc_story_en || dbProduct.story_en || "",
      featured_image_url: dbProduct.featured_image_url || getProductImages(dbProduct)[0],
      images: getProductImages(dbProduct),
      collections: getProductCollection(dbProduct),
    };
  } else {
    notFound();
  }

  // 2. SECONDARY FETCHES: Reviews, Related, Wishlist
  let relatedProducts: any[] = [];
  let reviews: any[] = [];
  let reviewStats = { avg: 0, count: 0, stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  let isWishlisted = false;

  if (dbProduct) {
    const [
      { data: dbRelated },
      { data: dbReviews },
      { data: dbWishlist }
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*, collections(name_en, name_fa)')
        .eq('collection_id', product.collection_id)
        .neq('id', product.id)
        .in('status', ['active', 'Active'])
        .limit(4),
      
      supabase
        .from('customer_reviews')
        .select('id, rating, title, body, created_at, reviewer_name, location, is_verified, photos, helpful_count')
        .eq('product_id', product.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(6),
        
      userSession.user ? supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userSession.user.id)
        .eq('product_id', product.id)
        .single() : Promise.resolve({ data: null })
    ]);
    
    relatedProducts = applyProductMetadata(dbRelated || [], productMetadata);
    reviews = dbReviews || [];
    isWishlisted = !!dbWishlist;
    
    // We will call the RPC here once it's created, for now mock stats
    // const { data: stats } = await supabase.rpc('get_product_review_stats', { p_product_id: product.id });
  }

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
              "url": `https://upsidetree.com/products/${product.slug}`,
              "priceCurrency": "CAD",
              "price": product.sale_price || product.price,
              "availability": (product.status === 'active' && product.stock_quantity > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": reviewStats.avg,
              "reviewCount": reviewStats.count
            }
          })
        }}
      />

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

      {/* COLLECTION BANNER */}
      <CollectionBanner collection={product.collections} />

      {/* RELATED PRODUCTS */}
      <RelatedProducts 
        products={relatedProducts} 
        collectionNameEn={product.collections.name_en} 
        collectionNameFa={product.collections.name_fa} 
      />

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
        price={product.price}
        salePrice={product.sale_price}
        isOutOfStock={product.status !== 'active' || product.stock_quantity <= 0}
      />
    </div>
  );
}
