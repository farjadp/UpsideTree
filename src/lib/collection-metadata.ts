import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "site-settings";
const FILE_PATH = "collections-metadata.json";

export type CollectionMetadata = {
  cover_image_url?: string;
  banner_image_url?: string;
  featured?: boolean;
  updated_at?: string;
};

type CollectionMetadataFile = {
  collections: Record<string, CollectionMetadata>;
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

export async function getCollectionMetadataMap(): Promise<Record<string, CollectionMetadata>> {
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

  const parsed = JSON.parse(text) as CollectionMetadataFile;
  return parsed.collections || {};
}

export async function getCollectionMetadata(collectionId: string) {
  const metadata = await getCollectionMetadataMap();
  return metadata[collectionId] || {};
}

export async function updateCollectionMetadata(collectionId: string, patch: CollectionMetadata) {
  const supabase = await ensureBucket();
  const current = await getCollectionMetadataMap();
  const existing = current[collectionId] || {};

  current[collectionId] = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const file: CollectionMetadataFile = { collections: current };
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

  return current[collectionId];
}

export function applyCollectionMetadata<T extends { id: string }>(
  collections: T[],
  metadata: Record<string, CollectionMetadata>,
) {
  return collections.map((collection) => {
    const itemMetadata = metadata[String(collection.id)] || {};

    return {
      ...collection,
      cover_image_url:
        itemMetadata.cover_image_url ||
        itemMetadata.banner_image_url ||
        (collection as any).cover_image_url ||
        (collection as any).banner_image_url ||
        null,
      banner_image_url:
        itemMetadata.banner_image_url ||
        itemMetadata.cover_image_url ||
        (collection as any).banner_image_url ||
        (collection as any).cover_image_url ||
        null,
      featured: Boolean(itemMetadata.featured ?? (collection as any).featured),
    };
  });
}
