import "server-only";

import { createClient } from "@/utils/supabase/server";

// Backed by the real public.product_attributes table (added in
// supabase/migrations/20260816000000_sync_live_schema.sql). Reads/writes go
// through the request-scoped Supabase client, so the existing RLS policies
// ("Admins have full access to product_attributes", "Public attributes
// viewable by everyone") are the actual security boundary — not app code.
//
// The DB row shape (name_en, name_fa, type, options, is_visible, sort_order)
// is intentionally narrower than what the product editor UI works with
// (adds a computed `slug` and a stored `is_variation` flag it doesn't
// persist yet). This module is the one place that adapts between the two,
// so nothing else needs to know the DB shape differs from the UI shape.

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
  type: "select" | "color" | "text";
  values: ProductAttributeValue[];
  is_visible: boolean;
  is_variation: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const VALID_TYPES = ["select", "color", "text"] as const;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

function normalizeType(type: unknown): StoredProductAttribute["type"] {
  return (VALID_TYPES as readonly string[]).includes(type as string)
    ? (type as StoredProductAttribute["type"])
    : "select";
}

function toStoredAttribute(row: any): StoredProductAttribute {
  return {
    id: row.id,
    name_en: row.name_en,
    name_fa: row.name_fa,
    slug: slugify(row.name_en || row.id),
    type: normalizeType(row.type),
    values: Array.isArray(row.options) ? row.options : [],
    is_visible: row.is_visible ?? true,
    is_variation: true,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export async function getStoredProductAttributes(): Promise<StoredProductAttribute[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attributes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(toStoredAttribute);
}

export async function createStoredProductAttribute(input: Partial<StoredProductAttribute>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attributes")
    .insert({
      name_en: String(input.name_en || "").trim(),
      name_fa: String(input.name_fa || "").trim(),
      type: normalizeType(input.type),
      options: Array.isArray(input.values) ? input.values : [],
      is_visible: input.is_visible ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toStoredAttribute(data);
}
