import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "site-settings";
const FILE_PATH = "products-metadata.json";

export type ProductMetadata = {
  name_en?: string | null;
  name_fa?: string | null;
  slug?: string | null;
  status?: string | null;
  visibility?: string | null;
  product_type?: string | null;
  collection_id?: string | null;
  price?: number | null;
  sale_price?: number | null;
  cost_price?: number | null;
  sku?: string | null;
  manage_stock?: boolean | null;
  stock_quantity?: number | null;
  desc_emotional_en?: string | null;
  desc_emotional_fa?: string | null;
  desc_functional_en?: string | null;
  desc_functional_fa?: string | null;
  desc_story_en?: string | null;
  desc_story_fa?: string | null;
  featured_image_url?: string | null;
  gallery_urls?: string[] | null;
  updated_at?: string;
};

type ProductMetadataFile = {
  products: Record<string, ProductMetadata>;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureBucket() {
  const supabase = getAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(error.message);
  }

  const exists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 1024 * 1024,
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(createError.message);
    }
  }

  return supabase;
}

export function slugifyProduct(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export async function getProductMetadataMap(): Promise<Record<string, ProductMetadata>> {
  const supabase = await ensureBucket();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(FILE_PATH);

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not found") || message.includes("does not exist")) {
      return {};
    }

    throw new Error(error.message);
  }

  const text = await data.text();
  if (!text.trim()) {
    return {};
  }

  const parsed = JSON.parse(text) as ProductMetadataFile;
  return parsed.products || {};
}

export async function getProductMetadata(productId: string) {
  const metadata = await getProductMetadataMap();
  return metadata[productId] || {};
}

export async function updateProductMetadata(productId: string, patch: ProductMetadata) {
  const supabase = await ensureBucket();
  const current = await getProductMetadataMap();
  const existing = current[productId] || {};

  current[productId] = {
    ...existing,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    updated_at: new Date().toISOString(),
  };

  const file: ProductMetadataFile = { products: current };
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(
    FILE_PATH,
    JSON.stringify(file, null, 2),
    {
      contentType: "application/json",
      upsert: true,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return current[productId];
}

export function applyProductMetadata<T extends { id: string }>(
  products: T[],
  metadata: Record<string, ProductMetadata>,
) {
  return products.map((product) => {
    const itemMetadata = metadata[String(product.id)] || {};
    const rawImages = (product as any).images;
    const rawGallery = (product as any).gallery_urls;
    const metadataGallery = itemMetadata.gallery_urls || [];
    const featuredImage =
      itemMetadata.featured_image_url ||
      (product as any).featured_image_url ||
      (Array.isArray(rawImages) ? rawImages[0] : null) ||
      (Array.isArray(rawGallery) ? rawGallery[0] : null) ||
      metadataGallery[0] ||
      null;

    return {
      ...product,
      ...itemMetadata,
      slug:
        itemMetadata.slug ||
        slugifyProduct(String((product as any).slug || (product as any).name_en || product.id)),
      collection_id: itemMetadata.collection_id ?? (product as any).collection_id ?? null,
      featured_image_url: featuredImage,
      gallery_urls:
        metadataGallery.length > 0
          ? metadataGallery
          : Array.isArray(rawGallery)
            ? rawGallery
            : [],
      images: [
        ...new Set(
          [
            featuredImage,
            ...metadataGallery,
            ...(Array.isArray(rawImages) ? rawImages : []),
            ...(Array.isArray(rawGallery) ? rawGallery : []),
          ].filter(Boolean),
        ),
      ],
    };
  });
}
