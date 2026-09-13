import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPrintifyProduct, type PrintifyVariant, type PrintifyOptionGroup } from "@/lib/printify";
import { slugifyProduct } from "@/lib/products";
import { resolveCategoryIds } from "@/lib/printify-category";
import { getUsdRates, usdCostToCad, usdRetailToCad, type UsdRates } from "@/lib/fx";

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
// A Printify product ships dozens of mockups (every variant × every camera
// angle). The storefront gallery wants the default variant's full set of
// angles, not 50 near-duplicates; each variant additionally gets its own
// first mockup so switching color/size on the product page switches the
// picture.
const GALLERY_LIMIT = 8;

function cadShelfPrice(usd: number, rates: UsdRates) {
  return usdRetailToCad(usd, rates);
}

function isPrintifyHosted(url: unknown) {
  return typeof url === "string" && url.includes("images-api.printify.com");
}

// Printify mockup URLs render at 1200px by default; `s` requests a larger
// render, capped by Printify at 2048px. The default was the main reason
// product photos looked soft on retina screens and in the zoom/lightbox.
const PRINTIFY_MOCKUP_SIZE = "2048";

export function highResMockup(src: string): string;
export function highResMockup(src: string | null | undefined): string | null;
export function highResMockup(src: string | null | undefined) {
  if (!src || !isPrintifyHosted(src)) return src ?? null;
  try {
    const url = new URL(src);
    url.searchParams.set("s", PRINTIFY_MOCKUP_SIZE);
    return url.toString();
  } catch {
    return src;
  }
}

function pickGallery(printifyProduct: Awaited<ReturnType<typeof getPrintifyProduct>>) {
  const images = printifyProduct.images ?? [];
  const defaultImage = images.find((img) => img.is_default) ?? images[0];
  const defaultVariantId =
    (printifyProduct.variants ?? []).find((v) => v.is_default && v.is_enabled)?.id ??
    (printifyProduct.variants ?? []).find((v) => v.is_enabled)?.id;

  // All camera angles of the default variant first…
  const angles = defaultVariantId
    ? images.filter((img) => (img.variant_ids ?? []).includes(defaultVariantId))
    : [];
  // …then one representative per remaining image group until the cap.
  const seen = new Set<string>();
  const gallery: string[] = [];
  for (const img of [...(defaultImage ? [defaultImage] : []), ...angles, ...images]) {
    if (!img?.src || seen.has(img.src)) continue;
    seen.add(img.src);
    gallery.push(highResMockup(img.src));
    if (gallery.length >= GALLERY_LIMIT) break;
  }
  return { featured: highResMockup(defaultImage?.src), gallery };
}

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

  // Printify bills and prices in USD; the catalog is CAD.
  const rates = await getUsdRates();

  // additional_collection_ids arrives with migration 20260913000000; until
  // it's applied, read (and write) the primary collection only.
  type CurrentProduct = {
    featured_image_url: string | null;
    gallery_urls: string[] | null;
    collection_id: string | null;
    additional_collection_ids?: string[] | null;
  };
  let currentProduct: CurrentProduct | null = null;
  let hasAdditionalColumn = true;
  {
    const withExtra = await supabase
      .from("products")
      .select("featured_image_url, gallery_urls, collection_id, additional_collection_ids")
      .eq("id", localProductId)
      .single();
    if (withExtra.error && /additional_collection_ids/.test(withExtra.error.message)) {
      hasAdditionalColumn = false;
      const primaryOnly = await supabase
        .from("products")
        .select("featured_image_url, gallery_urls, collection_id")
        .eq("id", localProductId)
        .single();
      currentProduct = primaryOnly.data as CurrentProduct | null;
    } else {
      currentProduct = withExtra.data as CurrentProduct | null;
    }
  }

  const { featured, gallery } = pickGallery(printifyProduct);

  const imagePayload: Record<string, unknown> = {};
  // Refresh imagery only where Printify is (or nothing is) the source —
  // a manually uploaded featured image or hand-curated gallery wins.
  if (featured && (!currentProduct?.featured_image_url || isPrintifyHosted(currentProduct.featured_image_url))) {
    imagePayload.featured_image_url = featured;
  }
  const currentGallery = (currentProduct?.gallery_urls ?? []) as string[];
  if (gallery.length > 0 && (currentGallery.length === 0 || currentGallery.every(isPrintifyHosted))) {
    imagePayload.gallery_urls = gallery.filter((src) => src !== (imagePayload.featured_image_url ?? currentProduct?.featured_image_url));
  }

  // Categories from Printify's tags, never overriding an admin choice:
  // the primary is filled only while the product has none, and extra
  // collections (Women for unisex apparel) only while that list is empty
  // and the primary is still the automatic one.
  const categoryPayload: Record<string, unknown> = {};
  if (currentProduct) {
    const auto = await resolveCategoryIds(supabase, printifyProduct.tags);
    if (auto) {
      const primary = currentProduct.collection_id ?? auto.primaryId;
      if (!currentProduct.collection_id) categoryPayload.collection_id = auto.primaryId;
      if (
        hasAdditionalColumn &&
        primary === auto.primaryId &&
        auto.additionalIds.length > 0 &&
        (currentProduct.additional_collection_ids ?? []).length === 0
      ) {
        categoryPayload.additional_collection_ids = auto.additionalIds;
      }
    }
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      ...categoryPayload,
      printify_product_id: printifyProduct.id,
      printify_blueprint_id: printifyProduct.blueprint_id,
      printify_print_provider_id: printifyProduct.print_provider_id,
      printify_sync_status: "synced",
      printify_synced_at: new Date().toISOString(),
      product_type: "pod",
      // Print-on-demand has no finite stock to count down.
      manage_stock: false,
      ...imagePayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", localProductId);

  if (productError) {
    throw new Error(productError.message);
  }

  const { data: existingVariants, error: existingError } = await supabase
    .from("product_variants")
    .select("id, printify_variant_id, price")
    .eq("product_id", localProductId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByPrintifyId = new Map(
    (existingVariants ?? [])
      .filter((v) => v.printify_variant_id !== null)
      .map((v) => [Number(v.printify_variant_id), { id: v.id as string, price: v.price == null ? null : Number(v.price) }])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];

  // First mockup that actually shows this variant, so the product page can
  // swap the picture when the shopper switches color/size.
  const imageForVariant = (variantId: number) =>
    highResMockup((printifyProduct.images ?? []).find((img) => (img.variant_ids ?? []).includes(variantId))?.src);

  usableVariants.forEach((variant: PrintifyVariant, index) => {
    const payload: Record<string, unknown> = {
      product_id: localProductId,
      printify_variant_id: variant.id,
      sku: variant.sku || null,
      name_en: variant.title,
      image_url: imageForVariant(variant.id),
      attributes: parseVariantAttributes(variant, printifyProduct.options),
      // Refreshed every sync at the current rate (padded for card FX fees),
      // so margins and the checkout below-cost guard compare CAD to CAD.
      cost_price: variant.cost != null ? usdCostToCad(variant.cost / 100, rates) : null,
      stock_quantity: null,
      is_default: variant.is_default,
      sort_order: index,
    };

    // Printify's variant `price` is the retail price set in Printify, in
    // USD cents. Each size keeps its own price, converted to CAD.
    const usdPrice = variant.price != null ? variant.price / 100 : null;
    const cadPrice = usdPrice != null ? cadShelfPrice(usdPrice, rates) : null;
    const existing = existingByPrintifyId.get(variant.id);
    if (existing) {
      // Price comes from Printify only while the local variant has none, or
      // still holds the raw USD number an earlier import stored as CAD.
      // Anything else is a merchant edit, so a re-sync never overwrites it
      // (and a later price change in Printify doesn't reach the storefront
      // on its own).
      const needsPrice = existing.price == null || existing.price === usdPrice;
      toUpdate.push({ id: existing.id, payload: needsPrice ? { ...payload, price: cadPrice } : payload });
    } else {
      toInsert.push({ ...payload, price: cadPrice });
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

  // The product price is what listings show ("from"): the cheapest variant,
  // so it can't drift from what checkout actually charges.
  const { data: pricedRows } = await supabase
    .from("product_variants")
    .select("price")
    .eq("product_id", localProductId)
    .not("price", "is", null);
  const variantPrices = (pricedRows ?? []).map((row) => Number(row.price)).filter((value) => value > 0);
  if (variantPrices.length > 0) {
    const { error } = await supabase
      .from("products")
      .update({ price: Math.min(...variantPrices), currency: "CAD" })
      .eq("id", localProductId);
    if (error) throw new Error(error.message);
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
 * Printify (English only, un-reviewed) and prices come from the retail
 * prices set per variant in Printify. None of that should go live to
 * customers until a human has priced and translated it.
 */
export async function createProductFromPrintify(
  supabase: SupabaseClient,
  printifyProductId: string
): Promise<ImportResult> {
  const printifyProduct = await getPrintifyProduct(printifyProductId);

  // Product price is the lowest option price: it's what listings show
  // ("from"), while each variant carries its own real price.
  const usableVariants = (printifyProduct.variants ?? []).filter((v) => v.is_enabled && v.price != null);
  const rates = await getUsdRates();
  const price = usableVariants.length
    ? cadShelfPrice(Math.min(...usableVariants.map((v) => v.price)) / 100, rates)
    : 0;

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
      featured_image_url: highResMockup(defaultImage?.src),
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
