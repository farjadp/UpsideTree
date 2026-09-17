import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { draftWithAnthropic } from "@/lib/ai/anthropic-copy";
import { draftWithOpenAI } from "@/lib/ai/openai-copy";
import { defaultProvider, type ProductCopyDraft } from "@/lib/ai/product-copy";
import { lintAgainstCharter } from "@/lib/social/charter";
import { SOCIAL_PRODUCT_COLUMNS, type SocialProduct } from "@/lib/social/types";

// Products imported from Printify arrive with the supplier's keyword title,
// the same title copied into the Persian name and a size-chart table as the
// description. Governance [P1]: none of that may be indexed or posted. Before
// a product is auto-posted, this rewrites it with the AI product copy that
// the admin editor uses, under the Brand Charter.

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

/**
 * Draft on-brand copy for a supplier-default product, save it, and return the
 * refreshed product. Throws BrandCopyError when the draft can't be trusted.
 */
export async function ensureBrandCopy(supabase: SupabaseClient, product: SocialProduct): Promise<SocialProduct> {
  if (!hasSupplierDefaultCopy(product)) return product;

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

  const { error } = await supabase
    .from("products")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);
  if (error) throw new BrandCopyError(`Saving rewritten product copy failed: ${error.message}`);

  const { data } = await supabase.from("products").select(SOCIAL_PRODUCT_COLUMNS).eq("id", product.id).single<SocialProduct>();
  return data ?? product;
}
