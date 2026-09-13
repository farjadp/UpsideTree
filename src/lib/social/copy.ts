import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ANTHROPIC_COPY_MODEL } from "@/lib/ai/anthropic-copy";
import { OPENAI_COPY_MODEL } from "@/lib/ai/openai-copy";
import { SYSTEM_PROMPT, defaultProvider } from "@/lib/ai/product-copy";
import type { SocialProduct } from "@/lib/social/types";

export const SocialCopySchema = z.object({
  instagram_caption: z
    .string()
    .describe(
      "Bilingual Instagram caption. A scroll-stopping Persian hook line first, 2-3 short Persian lines about the design, a blank line, then the same idea in natural English (2-3 lines). A few well-placed emoji at most. No hashtags, no URLs, no price."
    ),
  instagram_hashtags: z
    .array(z.string())
    .describe(
      "18-25 hashtags without the # sign, no spaces. Mix: specific design/product terms, Persian-language tags (e.g. هنر_ایرانی), diaspora and gift intent tags, a few broad reach tags. Always include UpsideTree."
    ),
  telegram_caption: z
    .string()
    .describe(
      "Bilingual Telegram channel post, max 600 characters. Persian first (hook + 1-2 lines), then one or two English lines. Plain text only: no HTML, no markdown, no hashtags, no URLs, no price."
    ),
  pinterest_title: z
    .string()
    .describe("English Pinterest pin title, max 90 characters. Lead with the search terms people use: design subject + product type + a Persian/Iranian qualifier."),
  pinterest_description: z
    .string()
    .describe(
      "English Pinterest description, 250-450 characters. Natural sentences, keyword-rich for Pinterest search (design subject, product type, gift occasion like Nowruz or Yalda when it genuinely fits, Persian art style). End with 3-5 hashtags."
    ),
  alt_text: z.string().describe("English alt text for the social image, max 200 characters, describing the product and scene literally."),
  image_scene: z
    .string()
    .describe(
      "English art direction for a lifestyle photo of this exact product, 60-120 words: setting, surface, props, lighting, camera angle. One single frame only. Contemporary and editorial, suited to this product type and design. Do not describe the printed artwork itself; it is copied from the reference photo."
    ),
});

export type SocialCopy = z.infer<typeof SocialCopySchema>;

const SOCIAL_RULES = `${SYSTEM_PROMPT}

You are now writing social media posts that link to the product page. Goals: stop the scroll, feel like a real person from the community wrote it, and be findable (Instagram hashtags, Pinterest search). Be playful and warm, never salesy or spammy. No fake urgency, no invented discounts, no claims not supported by the facts or image. Persian lines contain no English words.`;

function describeForSocial(product: SocialProduct) {
  const strip = (html: string | null) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return [
    "Write the social posts for this product.",
    "If the name or descriptions below contradict what is printed in the image, trust the image: supplier titles are sometimes wrong.",
    "",
    `Name (EN): ${product.name_en}`,
    `Name (FA): ${product.name_fa}`,
    `Product type: ${product.product_type ?? "unknown"}`,
    product.desc_emotional_en ? `Emotional line: ${strip(product.desc_emotional_en)}` : null,
    product.desc_story_en ? `Story: ${strip(product.desc_story_en)}` : null,
    product.desc_story_fa ? `Story (FA): ${strip(product.desc_story_fa)}` : null,
    product.desc_functional_en ? `Specs: ${strip(product.desc_functional_en).slice(0, 1500)}` : null,
    product.seo_keywords?.length ? `SEO keywords: ${product.seo_keywords.join(", ")}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

async function loadImageBase64(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) return null;
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim();
  if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) return null;
  return { mediaType, data: bytes.toString("base64") } as const;
}

async function withAnthropic(product: SocialProduct): Promise<SocialCopy> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = product.featured_image_url ? await loadImageBase64(product.featured_image_url).catch(() => null) : null;
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({ type: "text", text: describeForSocial(product) });

  const response = await new Anthropic().beta.messages.parse({
    model: ANTHROPIC_COPY_MODEL,
    max_tokens: 16000,
    system: SOCIAL_RULES,
    messages: [{ role: "user", content }],
    output_config: { format: betaZodOutputFormat(SocialCopySchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Claude couldn't write social copy for this product.");
  }
  return response.parsed_output;
}

async function withOpenAI(product: SocialProduct): Promise<SocialCopy> {
  const response = await new OpenAI().responses.parse({
    model: OPENAI_COPY_MODEL,
    instructions: SOCIAL_RULES,
    input: [
      {
        role: "user",
        content: [
          ...(product.featured_image_url
            ? [{ type: "input_image" as const, image_url: product.featured_image_url, detail: "auto" as const }]
            : []),
          { type: "input_text" as const, text: describeForSocial(product) },
        ],
      },
    ],
    text: { format: zodTextFormat(SocialCopySchema, "social_copy") },
  });
  if (!response.output_parsed) throw new Error("OpenAI couldn't write social copy for this product.");
  return response.output_parsed;
}

export async function writeSocialCopy(product: SocialProduct): Promise<SocialCopy> {
  const provider = defaultProvider();
  if (provider === "anthropic") return withAnthropic(product);
  if (provider === "openai") return withOpenAI(product);
  throw new Error("No AI provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY).");
}
