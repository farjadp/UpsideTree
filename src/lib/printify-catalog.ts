import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPrintifyProduct, type PrintifyVariant, type PrintifyOptionGroup } from "@/lib/printify";
import { slugifyProduct } from "@/lib/products";

// Printify tells us each option value's real type ("size", "color", ...) at
// the product level; a variant just references value ids. Found the hard
// way that the ordering in `variant.title` (e.g. "11oz / Black") is NOT
// consistent across blueprints — mugs list size-then-color, most apparel
// lists color-then-size — so guessing from position mislabels one or the
// other depending on the product. Resolving by id is reliable regardless
// of blueprint; falling back to position-in-title only when a product
// somehow ships without structured options at all.
export function parseVariantAttributes(
  variant: Pick<PrintifyVariant, "title" | "options">,
  productOptions?: PrintifyOptionGroup[]
): Record<string, string> {
  if (productOptions?.length && variant.options?.length) {
    const valueIndex = new Map<number, { type: string; title: string }>();
    for (const group of productOptions) {
      for (const value of group.values) {
        valueIndex.set(value.id, { type: group.type, title: value.title });
      }
    }

    const attributes: Record<string, string> = {};
    let resolvedAny = false;
    variant.options.forEach((valueId, index) => {
      const resolved = valueIndex.get(valueId);
      if (resolved) {
        attributes[resolved.type] = resolved.title;
        resolvedAny = true;
      } else {
        attributes[`option_${index + 1}`] = String(valueId);
      }
    });
    if (resolvedAny) return attributes;
  }

  // Fallback: split "Value / Value" and label by position, best-effort.
  const parts = variant.title.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};

  const attributes: Record<string, string> = {};
  const keys = ["color", "size"];
  parts.forEach((part, index) => {
    attributes[keys[index] ?? `option_${index + 1}`] = part;
  });
  return attributes;
}

export type LinkResult = {
  printifyProductId: string;
  printifyTitle: string;
  variantsImported: number;
  variantsSkipped: number;
};

/**
 * Point a local product at a Printify product and mirror its variants.
 *
 * Local `product_variants` is the missing half of fulfillment — an order
 * can't resolve to something printable without one row per Printify
 * variant — so linking imports them rather than leaving that as a second
 * manual step.
 *
 * Re-linking the same pair is safe: existing variants are matched on
 * printify_variant_id and updated in place, so local edits to unrelated
 * fields survive and no duplicates appear.
 */
export async function linkProductToPrintify(
  supabase: SupabaseClient,
  localProductId: string,
  printifyProductId: string
): Promise<LinkResult> {
  const printifyProduct = await getPrintifyProduct(printifyProductId);

  // Disabled variants aren't purchasable on Printify's side, so importing
  // them would let a customer buy something that can't be produced.
  const usableVariants = (printifyProduct.variants ?? []).filter((v) => v.is_enabled);
  const skipped = (printifyProduct.variants ?? []).length - usableVariants.length;

  const { error: productError } = await supabase
    .from("products")
    .update({
      printify_product_id: printifyProduct.id,
      printify_blueprint_id: printifyProduct.blueprint_id,
      printify_print_provider_id: printifyProduct.print_provider_id,
      printify_sync_status: "synced",
      printify_synced_at: new Date().toISOString(),
      product_type: "pod",
      // Print-on-demand has no finite stock to count down.
      manage_stock: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", localProductId);

  if (productError) {
    throw new Error(productError.message);
  }

  const { data: existingVariants, error: existingError } = await supabase
    .from("product_variants")
    .select("id, printify_variant_id")
    .eq("product_id", localProductId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByPrintifyId = new Map(
    (existingVariants ?? [])
      .filter((v) => v.printify_variant_id !== null)
      .map((v) => [Number(v.printify_variant_id), v.id as string])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];

  usableVariants.forEach((variant: PrintifyVariant, index) => {
    const payload = {
      product_id: localProductId,
      printify_variant_id: variant.id,
      sku: variant.sku || null,
      name_en: variant.title,
      attributes: parseVariantAttributes(variant, printifyProduct.options),
      // Retail price stays the merchant's decision — a null variant price
      // makes checkout fall back to the product price, which is what the
      // storefront already expects. Printify's `price` is their cents
      // figure, not what Upside Tree charges.
      price: null,
      cost_price: variant.cost != null ? variant.cost / 100 : null,
      stock_quantity: null,
      is_default: variant.is_default,
      sort_order: index,
    };

    const existingId = existingByPrintifyId.get(variant.id);
    if (existingId) {
      toUpdate.push({ id: existingId, payload });
    } else {
      toInsert.push(payload);
    }
  });

  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_variants").insert(toInsert);
    if (error) {
      throw new Error(error.message);
    }
  }

  for (const { id, payload } of toUpdate) {
    const { error } = await supabase.from("product_variants").update(payload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    printifyProductId: printifyProduct.id,
    printifyTitle: printifyProduct.title,
    variantsImported: usableVariants.length,
    variantsSkipped: skipped,
  };
}

async function ensureUniqueProductSlug(supabase: SupabaseClient, rawSlug: string) {
  const base = slugifyProduct(rawSlug) || `product-${Date.now()}`;

  const { data } = await supabase.from("products").select("slug").ilike("slug", `${base}%`);
  const used = new Set((data ?? []).map((row) => String(row.slug).toLowerCase()));

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export type ImportResult = LinkResult & { productId: string; slug: string };

/**
 * Create a brand-new local product from a Printify product that has no
 * local counterpart at all yet — the case linkProductToPrintify doesn't
 * cover, since it requires a local product to already exist.
 *
 * Lands as status 'draft': title/description are pulled straight from
 * Printify (English only, un-reviewed) and the price defaults to whatever
 * the default variant costs there. None of that should go live to
 * customers until a human has priced and translated it.
 */
export async function createProductFromPrintify(
  supabase: SupabaseClient,
  printifyProductId: string
): Promise<ImportResult> {
  const printifyProduct = await getPrintifyProduct(printifyProductId);

  const usableVariants = (printifyProduct.variants ?? []).filter((v) => v.is_enabled);
  const priceSource = usableVariants.find((v) => v.is_default) ?? usableVariants[0];
  const price = priceSource ? priceSource.price / 100 : 0;

  const defaultImage = printifyProduct.images?.find((img) => img.is_default) ?? printifyProduct.images?.[0];

  const slug = await ensureUniqueProductSlug(supabase, printifyProduct.title);

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      slug,
      status: "draft",
      product_type: "pod",
      name_en: printifyProduct.title,
      // Printify has no Persian field — this is a placeholder, not a
      // translation, and the product stays in draft until someone gives
      // it a real one.
      name_fa: printifyProduct.title,
      desc_functional_en: printifyProduct.description || null,
      price,
      currency: "CAD",
      manage_stock: false,
      featured_image_url: defaultImage?.src ?? null,
    })
    .select("id, slug")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const linkResult = await linkProductToPrintify(supabase, created.id, printifyProductId);

  return { ...linkResult, productId: created.id, slug: created.slug };
}

/**
 * Detach a local product from Printify. Imported variants are left in
 * place but lose their Printify id — deleting them would silently break
 * historical order_items that reference them.
 */
export async function unlinkProductFromPrintify(supabase: SupabaseClient, localProductId: string) {
  const { error: variantError } = await supabase
    .from("product_variants")
    .update({ printify_variant_id: null })
    .eq("product_id", localProductId);

  if (variantError) {
    throw new Error(variantError.message);
  }

  const { error } = await supabase
    .from("products")
    .update({
      printify_product_id: null,
      printify_blueprint_id: null,
      printify_print_provider_id: null,
      printify_sync_status: "not_listed",
      printify_synced_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", localProductId);

  if (error) {
    throw new Error(error.message);
  }
}
