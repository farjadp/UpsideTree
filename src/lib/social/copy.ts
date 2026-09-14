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
  story_angle: z
    .string()
    .describe(
      "Plan first, in English, 2-4 sentences: the one human story this post tells (a moment, memory or feeling tied to what is actually printed on the product), its tension, and how the product fits the ending. Every other field follows this same storyline."
    ),
  instagram_caption: z
    .string()
    .describe(
      "Instagram caption told as a short story, mostly Persian. Line 1: a Persian hook under 110 characters that opens the story (a scene, a memory, a surprising line) and makes people tap 'more'; no emoji-only or generic opener. Then 4-7 short Persian lines with a clear arc: the moment → the meaning behind the design → why it matters now → the product as the quiet ending. Naturally include the Persian words people would search (product type + design subject) inside the story, not as a keyword list. Then a blank line and 2-3 English lines carrying the same story for non-Persian readers. End with one genuine question or an invitation to send it to the person it reminds them of (sends and saves matter most) — no engagement bait like 'comment YES'. Short paragraphs, 0-3 emoji. No hashtags, no URLs, no price."
    ),
  instagram_hashtags: z
    .array(z.string())
    .describe(
      "Exactly 4 hashtags without the # sign, underscores instead of spaces. At least 3 in Persian. Each must describe THIS post specifically (design subject, art style, product type, the feeling or occasion) — no generic reach tags like love/instagood/explore, no brand tag (it is added automatically)."
    ),
  telegram_caption: z
    .string()
    .describe(
      "Telegram channel post, max 650 characters, the same storyline condensed: a Persian hook line, 2-3 Persian story lines ending on the product, then 1-2 English lines. Plain text only: no HTML, no markdown, no hashtags, no URLs, no price."
    ),
  pinterest_title: z
    .string()
    .describe("English Pinterest pin title, max 90 characters. Lead with the search terms people use: design subject + product type + a Persian/Iranian qualifier."),
  pinterest_description: z
    .string()
    .describe(
      "English Pinterest description, 250-450 characters. Open with one sentence of the story, then natural keyword-rich sentences for Pinterest search (design subject, product type, gift occasion like Nowruz or Yalda only when it genuinely fits, Persian art style). End with 3-5 hashtags."
    ),
  alt_text: z.string().describe("English alt text for the hero image, max 200 characters, describing the product and scene literally."),
  image_scene: z
    .string()
    .describe(
      "Slide 1, the hook. English art direction for a lifestyle photo of this exact product that shows the opening moment of the story, 60-120 words: setting, surface, props, lighting, camera angle. One single frame. Contemporary and editorial, suited to this product type. Do not describe the printed artwork itself; it is copied from the reference photo."
    ),
  detail_scene: z
    .string()
    .describe(
      "Slide 2, the meaning. English art direction, 50-100 words, for a close-up of the same product where the printed design fills much of the frame, in a setting that continues the story from slide 1 (same world, different moment or angle; e.g. hands holding it, fabric texture, steam over the mug). One single frame. Do not describe the artwork itself."
    ),
  detail_alt_text: z.string().describe("English alt text for the close-up slide, max 200 characters."),
});

export type SocialCopy = z.infer<typeof SocialCopySchema>;

const SOCIAL_RULES = `${SYSTEM_PROMPT}

You are now writing social media posts that link to the product page, as storytelling: every post tells one small, specific human story rooted in what is printed on the product, and the product arrives at the end of that story instead of being announced at the start. The post should feel like someone from the community wrote it, and be findable (Instagram search reads captions and alt text; Pinterest is a search engine). Be warm and a little playful, never salesy or spammy. No fake urgency, no invented discounts, no claims not supported by the facts or image. Persian lines contain no English words.`;

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
