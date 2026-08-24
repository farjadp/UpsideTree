import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listPrintifyProducts, type PrintifyProduct } from "@/lib/printify";
import { createProductFromPrintify, linkProductToPrintify } from "@/lib/printify-catalog";

// Catalog mirror: Printify is the source of truth for WHICH products exist
// and their variants; the local row remains the source of truth for the
// merchant-edited fields (Persian name, descriptions, retail price). The
// sync therefore:
//   - imports remote products that have no local counterpart (and, unlike
//     the admin's one-at-a-time import, activates them when they're visible
//     on Printify — the founder's explicit call: what's live there is live
//     here),
//   - refreshes variants on already-linked products,
//   - mirrors Printify visibility -> local status for synced products, and
//   - demotes local products whose Printify counterpart disappeared.
// It never touches products that were never linked to Printify.

type SyncedProductRow = {
  id: string;
  slug: string;
  status: string;
  name_en: string;
  printify_product_id: string;
  printify_synced_at: string | null;
  featured_image_url: string | null;
};

export type CatalogSyncResult = {
  remoteCount: number;
  imported: Array<{ slug: string; printifyProductId: string }>;
  activated: string[];
  deactivated: string[];
  refreshed: string[];
  removed: string[];
  errors: string[];
};

function statusForVisibility(product: PrintifyProduct) {
  return product.visible === false ? "draft" : "active";
}

// Skip variant refresh for products synced very recently — a webhook burst
// (Printify sends one event per changed entity) shouldn't trigger N full
// re-links in a row.
const REFRESH_INTERVAL_MS = 60 * 1000;

export async function syncPrintifyCatalog(
  supabase: SupabaseClient,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<CatalogSyncResult> {
  const result: CatalogSyncResult = {
    remoteCount: 0,
    imported: [],
    activated: [],
    deactivated: [],
    refreshed: [],
    removed: [],
    errors: [],
  };

  const remote = await listPrintifyProducts();
  result.remoteCount = remote.length;
  const remoteById = new Map(remote.map((p) => [p.id, p]));

  const { data: localRows, error: localError } = await supabase
    .from("products")
    .select("id, slug, status, name_en, printify_product_id, printify_synced_at, featured_image_url")
    .not("printify_product_id", "is", null);

  if (localError) {
    throw new Error(localError.message);
  }

  const local = (localRows ?? []) as SyncedProductRow[];
  const localByPrintifyId = new Map(local.map((p) => [p.printify_product_id, p]));

  // ---- New on Printify → import and mirror visibility ---------------------
  for (const remoteProduct of remote) {
    if (localByPrintifyId.has(remoteProduct.id)) continue;

    try {
      const imported = await createProductFromPrintify(supabase, remoteProduct.id);
      const status = statusForVisibility(remoteProduct);
      if (status !== "draft") {
        await supabase
          .from("products")
          .update({ status, published_at: new Date().toISOString() })
          .eq("id", imported.productId);
      }
      result.imported.push({ slug: imported.slug, printifyProductId: remoteProduct.id });
      if (status === "active") result.activated.push(imported.slug);
    } catch (err) {
      result.errors.push(
        `import ${remoteProduct.id} "${remoteProduct.title}": ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // ---- Already linked → refresh variants, mirror visibility ---------------
  for (const localProduct of local) {
    const remoteProduct = remoteById.get(localProduct.printify_product_id);

    if (!remoteProduct) {
      // Gone from Printify: unbuyable, so pull it off the storefront. Keep
      // the row (order history references it) and mark it out of sync.
      if (localProduct.status === "active") {
        const { error } = await supabase
          .from("products")
          .update({
            status: "draft",
            printify_sync_status: "out_of_sync",
            updated_at: new Date().toISOString(),
          })
          .eq("id", localProduct.id);
        if (error) result.errors.push(`demote ${localProduct.slug}: ${error.message}`);
        else result.removed.push(localProduct.slug);
      }
      continue;
    }

    const lastSynced = localProduct.printify_synced_at
      ? new Date(localProduct.printify_synced_at).getTime()
      : 0;
    if (forceRefresh || Date.now() - lastSynced > REFRESH_INTERVAL_MS) {
      try {
        await linkProductToPrintify(supabase, localProduct.id, localProduct.printify_product_id);
        result.refreshed.push(localProduct.slug);
      } catch (err) {
        result.errors.push(
          `refresh ${localProduct.slug}: ${err instanceof Error ? err.message : err}`
        );
        continue;
      }
    }

    const desiredStatus = statusForVisibility(remoteProduct);
    if (localProduct.status !== desiredStatus) {
      const payload: Record<string, unknown> = {
        status: desiredStatus,
        updated_at: new Date().toISOString(),
      };
      if (desiredStatus === "active") payload.published_at = new Date().toISOString();
      const { error } = await supabase.from("products").update(payload).eq("id", localProduct.id);
      if (error) {
        result.errors.push(`status ${localProduct.slug}: ${error.message}`);
      } else if (desiredStatus === "active") {
        result.activated.push(localProduct.slug);
      } else {
        result.deactivated.push(localProduct.slug);
      }
    }
  }

  // Best-effort bookkeeping so the admin can see when the mirror last ran.
  await supabase.from("settings").upsert(
    {
      namespace: "printify",
      key: "last_catalog_sync",
      value: {
        at: new Date().toISOString(),
        remote_count: result.remoteCount,
        imported: result.imported.length,
        errors: result.errors.length,
      },
      is_public: false,
    },
    { onConflict: "namespace,key" }
  );

  return result;
}
