import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Product-view tracking backing the homepage "Most Viewed" tab. Views land
// in user_activity_logs (event_type 'product_view', product id in metadata)
// through the service-role client: the table is admin-write under RLS, and
// an anonymous visitor's page render is exactly the event we're counting.
// Fire-and-forget — a lost view must never cost a page render.

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function recordProductView(productId: string) {
  const supabase = getAdminClient();
  if (!supabase) return;

  void supabase
    .from("user_activity_logs")
    .insert({
      event_type: "product_view",
      event_category: "storefront",
      metadata: { product_id: productId },
    })
    .then(({ error }) => {
      if (error) console.error("product view log failed:", error.message);
    });
}

/**
 * View counts per product id, most-viewed first. Reads the recent window
 * (last `limit` view events) rather than all-time, so the ranking follows
 * what people are looking at now — and stays a cheap indexed read.
 */
export async function getMostViewedProductIds(limit = 2000): Promise<string[]> {
  const supabase = getAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_activity_logs")
    .select("metadata")
    .eq("event_type", "product_view")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const id = (row.metadata as { product_id?: string } | null)?.product_id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
