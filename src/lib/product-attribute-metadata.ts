import "server-only";

import { randomUUID } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "site-settings";
const FILE_PATH = "product-attributes.json";

export type ProductAttributeValue = {
  label_en: string;
  label_fa: string;
  color_hex?: string;
};

export type StoredProductAttribute = {
  id: string;
  name_en: string;
  name_fa: string;
  slug: string;
  type: "select" | "color" | "text" | "number";
  values: ProductAttributeValue[];
  is_visible: boolean;
  is_variation: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProductAttributesFile = {
  attributes: StoredProductAttribute[];
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

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

export async function getStoredProductAttributes(): Promise<StoredProductAttribute[]> {
  const supabase = await ensureBucket();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(FILE_PATH);

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not found") || message.includes("does not exist")) {
      return [];
    }

    throw new Error(error.message);
  }

  const text = await data.text();
  if (!text.trim()) {
    return [];
  }

  const parsed = JSON.parse(text) as ProductAttributesFile;
  return (parsed.attributes || []).sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

async function writeStoredProductAttributes(attributes: StoredProductAttribute[]) {
  const supabase = await ensureBucket();
  const file: ProductAttributesFile = { attributes };
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
}

function uniqueSlug(baseSlug: string, attributes: StoredProductAttribute[]) {
  const slug = slugify(baseSlug) || `attribute-${Date.now()}`;
  const used = new Set(attributes.map((attribute) => attribute.slug.toLowerCase()));

  if (!used.has(slug)) {
    return slug;
  }

  let suffix = 2;
  let nextSlug = `${slug}-${suffix}`;
  while (used.has(nextSlug)) {
    suffix += 1;
    nextSlug = `${slug}-${suffix}`;
  }

  return nextSlug;
}

export async function createStoredProductAttribute(input: Partial<StoredProductAttribute>) {
  const attributes = await getStoredProductAttributes();
  const now = new Date().toISOString();
  const attribute: StoredProductAttribute = {
    id: randomUUID(),
    name_en: String(input.name_en || "").trim(),
    name_fa: String(input.name_fa || "").trim(),
    slug: uniqueSlug(String(input.slug || input.name_en || ""), attributes),
    type: input.type || "select",
    values: Array.isArray(input.values) ? input.values : [],
    is_visible: input.is_visible ?? true,
    is_variation: input.is_variation ?? true,
    sort_order: input.sort_order ?? attributes.length,
    created_at: now,
    updated_at: now,
  };

  const nextAttributes = [...attributes, attribute];
  await writeStoredProductAttributes(nextAttributes);
  return attribute;
}
