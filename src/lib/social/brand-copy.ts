import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { draftWithAnthropic } from "@/lib/ai/anthropic-copy";
import { draftWithOpenAI } from "@/lib/ai/openai-copy";
import { defaultProvider, type ProductCopyDraft } from "@/lib/ai/product-copy";
import { ensureUniqueProductSlug } from "@/lib/printify-catalog";
import { lintAgainstCharter } from "@/lib/social/charter";
import { SOCIAL_PRODUCT_COLUMNS, type SocialProduct } from "@/lib/social/types";

// Products imported from Printify arrive with the supplier's keyword title,
// the same title copied into the Persian name and a size-chart table as the
// description. Governance [P1]: none of that may be indexed or posted. Before
// a product is posted, this drafts the AI product copy that the admin editor
// uses, under the Brand Charter. The draft is applied to the product only
// when the founder approves the post it travels with (Agentic spec §5).

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const listHtml = (lines: string[]) => `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
const paragraphHtml = (text: string) =>
  text.split(/\n{2,}/).map((part) => `<p>${escapeHtml(part.trim())}</p>`).join("");

/** True when the product still carries supplier-default text. */
export function hasSupplierDefaultCopy(product: SocialProduct) {
  const sameName = !product.name_fa || product.name_fa.trim() === product.name_en.trim();
  const noPersian = !/[؀-ۿ]/.test(product.name_fa ?? "");
  const sizeChartOnly = /id="size-guide"/.test(product.desc_functional_en ?? "") && !product.desc_emotional_en;
  return sameName || noPersian || sizeChartOnly || !product.desc_emotional_en;
}

export class BrandCopyError extends Error {}

/** The columns a brand rewrite changes on `products`. */
export type BrandCopyUpdate = {
  slug: string;
  name_en: string;
  name_fa: string;
  desc_emotional_en: string;
  desc_emotional_fa: string;
  desc_functional_en: string;
  desc_functional_fa: string;
  desc_story_en: string;
  desc_story_fa: string;
  seo_title_en: string;
  seo_title_fa: string;
  seo_description_en: string;
  seo_description_fa: string;
};

/**
 * Draft on-brand copy for a supplier-default product without saving it.
 * Returns the update to apply on approval and the product as it will read
 * once applied, so the copywriter works from the new name. Null when the
 * product already carries brand copy. Throws BrandCopyError when the draft
 * can't be trusted.
 */
export async function draftBrandCopy(
  supabase: SupabaseClient,
  product: SocialProduct
): Promise<{ update: BrandCopyUpdate; product: SocialProduct } | null> {
  if (!hasSupplierDefaultCopy(product)) return null;

  const provider = defaultProvider();
  if (!provider) throw new BrandCopyError("No AI provider configured to rewrite supplier text.");

  const specs = (product.desc_functional_en ?? "").replace(/<table[\s\S]*?<\/table>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const facts = {
    name_en: product.name_en,
    name_fa: "",
    product_type: product.product_type ?? "",
    collection: "",
    specs: specs.slice(0, 8000),
    options: [],
    image_url: product.featured_image_url ?? "",
  };
  const draft: ProductCopyDraft = provider === "openai" ? await draftWithOpenAI(facts) : await draftWithAnthropic(facts);

  const lint = lintAgainstCharter({
    name_en: draft.name_en,
    name_fa: draft.name_fa,
    emotional: [draft.emotional_en, draft.emotional_fa],
    story: [draft.story_en, draft.story_fa],
    seo: [draft.seo_title_en, draft.seo_title_fa, draft.seo_description_en, draft.seo_description_fa],
  });
  if (lint.length) {
    throw new BrandCopyError(`Rewritten product copy breaks the Charter: ${lint.map((v) => `${v.field} "${v.term}"`).join(", ")}`);
  }
  if (!draft.name_en.trim() || !/[؀-ۿ]/.test(draft.name_fa)) {
    throw new BrandCopyError("Rewritten product copy is missing a usable name.");
  }

  // The URL follows the new name. Only safe because this runs before the
  // product has been posted anywhere; the supplier slug was never shared.
  const { count: posted } = await supabase
    .from("social_posts")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("status", "posted");
  const slug = posted ? product.slug : await ensureUniqueProductSlug(supabase, draft.name_en.split("|")[0]);

  const update: BrandCopyUpdate = {
    slug,
    name_en: draft.name_en.trim(),
    name_fa: draft.name_fa.trim(),
    desc_emotional_en: draft.emotional_en,
    desc_emotional_fa: draft.emotional_fa,
    desc_functional_en: listHtml(draft.functional_en),
    desc_functional_fa: listHtml(draft.functional_fa),
    desc_story_en: paragraphHtml(draft.story_en),
    desc_story_fa: paragraphHtml(draft.story_fa),
    seo_title_en: draft.seo_title_en,
    seo_title_fa: draft.seo_title_fa,
    seo_description_en: draft.seo_description_en,
    seo_description_fa: draft.seo_description_fa,
  };
  return { update, product: { ...product, ...update } };
}

/**
 * Save an approved brand rewrite. The slug is checked again in case another
 * product took it while the draft waited for approval.
 */
export async function applyBrandCopy(supabase: SupabaseClient, productId: string, update: BrandCopyUpdate): Promise<SocialProduct> {
  const { data: current } = await supabase.from("products").select("slug").eq("id", productId).single<{ slug: string }>();
  let slug = update.slug;
  if (current && current.slug !== slug) {
    const { data: taken } = await supabase.from("products").select("id").eq("slug", slug).neq("id", productId).limit(1);
    if (taken?.length) slug = await ensureUniqueProductSlug(supabase, update.name_en.split("|")[0]);
  }
  const { error } = await supabase
    .from("products")
    .update({ ...update, slug, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw new BrandCopyError(`Saving rewritten product copy failed: ${error.message}`);

  const { data } = await supabase.from("products").select(SOCIAL_PRODUCT_COLUMNS).eq("id", productId).single<SocialProduct>();
  if (!data) throw new BrandCopyError("Product disappeared while applying its brand copy.");
  return data;
}
