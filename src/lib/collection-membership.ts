import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// A product belongs to its primary collection (products.collection_id) and
// to any in products.additional_collection_ids — e.g. unisex apparel under
// both Men and Women. Every storefront "which products are in collection X"
// question goes through here so the two stay consistent.
//
// Until migration 20260913000000 is applied the column doesn't exist and
// PostgREST rejects queries naming it; each helper then falls back to the
// primary collection only.

const ACTIVE = ["active", "Active"];

function isMissingColumn(error: { message?: string; code?: string } | null) {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /additional_collection_ids/.test(error.message ?? "")));
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

/**
 * Active product counts per collection id (a unisex product counts in each
 * collection it appears in), plus the distinct product total.
 */
export async function countActiveProductsByCollection(supabase: SupabaseClient) {
  let rows: Array<{ collection_id: string | null; additional_collection_ids?: string[] | null }> = [];

  const withExtra = await supabase
    .from("products")
    .select("collection_id, additional_collection_ids")
    .in("status", ACTIVE);

  if (!withExtra.error) {
    rows = withExtra.data ?? [];
  } else if (isMissingColumn(withExtra.error)) {
    const primaryOnly = await supabase.from("products").select("collection_id").in("status", ACTIVE);
    rows = primaryOnly.data ?? [];
  }

  const byCollection: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const ids = uniqueIds([row.collection_id ?? "", ...(row.additional_collection_ids ?? [])]);
    if (ids.length > 0) total += 1;
    for (const id of ids) {
      byCollection[id] = (byCollection[id] ?? 0) + 1;
    }
  }
  return { byCollection, total };
}

/** Active products whose primary or additional collections include any of `collectionIds`. */
export async function fetchActiveProductsInCollections<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  collectionIds: string[],
  columns = "*"
): Promise<T[]> {
  const ids = uniqueIds(collectionIds);
  if (ids.length === 0) return [];

  const withExtra = await supabase
    .from("products")
    .select(columns)
    .in("status", ACTIVE)
    .or(`collection_id.in.(${ids.join(",")}),additional_collection_ids.ov.{${ids.join(",")}}`)
    .order("created_at", { ascending: false });

  if (!withExtra.error) return (withExtra.data ?? []) as T[];

  if (!isMissingColumn(withExtra.error)) {
    console.error("Collection product query failed:", withExtra.error.message);
    return [];
  }

  const primaryOnly = await supabase
    .from("products")
    .select(columns)
    .in("status", ACTIVE)
    .in("collection_id", ids)
    .order("created_at", { ascending: false });

  return (primaryOnly.data ?? []) as T[];
}
