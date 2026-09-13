import "server-only";

import { z } from "zod";

// Shared contract for AI product-copy drafts. Both providers get the same
// instructions, the same product facts and must return the same shape, so
// their drafts can be compared field by field in the admin editor.

export const DraftSchema = z.object({
  name_fa: z.string().describe("Natural Persian product name, not a word-for-word translation of marketplace keywords."),
  emotional_en: z.string().describe("One sentence, max 25 words: what it feels like to own or give this piece."),
  emotional_fa: z.string().describe("One Persian sentence, max 20 words, same idea written natively in Persian."),
  functional_en: z.array(z.string()).describe("3-6 short spec lines. Only facts present in the provided specs or clearly visible in the image."),
  functional_fa: z.array(z.string()).describe("The same spec lines in Persian."),
  story_en: z.string().describe("Max 80 words: the cultural reference behind the design and why it matters today."),
  story_fa: z.string().describe("Max 70 Persian words, same story written natively in Persian."),
  seo_title_en: z.string().describe("Max 60 characters, includes the product type."),
  seo_title_fa: z.string().describe("Max 60 characters, in Persian."),
  seo_description_en: z.string().describe("Max 155 characters."),
  seo_description_fa: z.string().describe("Max 155 characters, in Persian."),
});

export type ProductCopyDraft = z.infer<typeof DraftSchema>;

export const ProductFactsSchema = z.object({
  name_en: z.string().max(300).default(""),
  name_fa: z.string().max(300).default(""),
  product_type: z.string().max(60).default(""),
  collection: z.string().max(200).default(""),
  specs: z.string().max(8000).default(""),
  options: z.array(z.string().max(200)).max(80).default([]),
  image_url: z.string().url().max(2000).optional().or(z.literal("")),
});

export type ProductFacts = z.infer<typeof ProductFactsSchema>;

export const SYSTEM_PROMPT = `You write product copy for Upside Tree, a Canadian store selling print-on-demand objects (apparel, canvas, mugs, stickers, bags) with contemporary Persian and Iranian designs, sold bilingually in English and Persian to the Iranian diaspora and people who love the culture.

Voice: rooted, warm, precise, contemporary. Plain words over ornament. Specific over grand.

Rules:
- Describe this specific design. Use the image to see what is actually printed; don't guess at artwork you can't see.
- Spec lines state only facts from the provided specs or clearly visible in the image. Never invent materials, sizes, certifications, origins or care instructions.
- Marketplace titles often carry keyword stuffing or off-brand words (e.g. seasonal or Halloween terms); write names that fit the actual design instead.
- Avoid clichés: "ancient", "royal", "luxury", "timeless", "exotic", "mystical". Don't exoticize.
- Persian is written natively, not translated word-for-word: standard modern Persian, correct half-spaces (ZWNJ) as in "می‌شود" and "ریشه‌ها", Persian punctuation « » and ،.
- Political or historical figures and symbols: describe them factually and respectfully without taking a political position.`;

export function describeProduct(facts: ProductFacts) {
  return [
    "Draft the full bilingual copy for this product.",
    "",
    `Current title: ${facts.name_en || "(none)"}`,
    facts.name_fa && facts.name_fa !== facts.name_en ? `Current Persian title: ${facts.name_fa}` : null,
    `Product type: ${facts.product_type || "unknown"}`,
    `Collection: ${facts.collection || "none"}`,
    facts.options.length ? `Available options: ${facts.options.join("; ")}` : null,
    `Specs we hold (may be HTML from the supplier):\n${facts.specs || "(none)"}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export type AiProvider = "anthropic" | "openai";

/** A failure with a status and a message that's safe to show the admin. */
export class AiDraftError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function configuredProviders(): AiProvider[] {
  const providers: AiProvider[] = [];
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  return providers;
}

/** AI_PROVIDER if it's configured, otherwise the first provider with a key. */
export function defaultProvider(): AiProvider | null {
  const available = configuredProviders();
  const preferred = process.env.AI_PROVIDER as AiProvider | undefined;
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? null;
}
