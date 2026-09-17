import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ANTHROPIC_COPY_MODEL } from "@/lib/ai/anthropic-copy";
import { OPENAI_COPY_MODEL } from "@/lib/ai/openai-copy";
import { SYSTEM_PROMPT, defaultProvider } from "@/lib/ai/product-copy";
import { CHARTER_RULES, cleanHashtags, lintAgainstCharter, type CharterViolation } from "@/lib/social/charter";
import type { SocialProduct } from "@/lib/social/types";

export const SocialCopySchema = z.object({
  story_angle: z
    .string()
    .describe(
      "Plan first, in English, 2-4 sentences: the one human story this post tells (a moment, a feeling or a gift tied to what is actually printed on the product; about \"you\" the reader or someone in your life, never a memory the brand claims), its tension, and how the product fits the ending. Every other field follows this same storyline."
    ),
  instagram_caption: z
    .string()
    .describe(
      "Instagram caption told as a short story, mostly Persian. Line 1: a Persian hook under 110 characters that opens the story (a scene, a feeling, a surprising line) and makes people tap 'more'; no emoji-only or generic opener. Then 4-7 short Persian lines with a clear arc: the moment → what the design shows → why it matters to you → the product as the quiet ending. Naturally include the Persian words people would search (product type + design subject) inside the story, not as a keyword list. Then a blank line and 2-3 English lines carrying the same story for readers who don't read Persian, including the English meaning of any Persian text printed on the product. End with one genuine question or an invitation to send it to the person it reminds them of (sends and saves matter most) — no engagement bait like 'comment YES'. Short paragraphs, 0-3 emoji. No hashtags, no URLs, no price."
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
      "Slide 1, the hook. English art direction for a lifestyle photo of this exact product that shows the opening moment of the story, 60-120 words: setting, surface, props, lighting, camera angle. One single frame. Contemporary and editorial, suited to this product type. For anything worn or carried, put a real person in the frame (an Iranian woman or man, 20-45, hair uncovered, everyday contemporary clothes) and say what they are doing; for objects, people are optional. Never describe religious dress, objects or places. Do not describe the printed artwork itself; it is copied from the reference photo."
    ),
  detail_scene: z
    .string()
    .describe(
      "Slide 2, the meaning. English art direction, 50-100 words, for a close-up of the same product where the printed design fills much of the frame, in a setting that continues the story from slide 1 (same world, different moment or angle; e.g. hands holding it, fabric texture, steam over the mug). One single frame. Hands and bodies may appear; no religious dress, objects or places. Do not describe the artwork itself."
    ),
  detail_alt_text: z.string().describe("English alt text for the close-up slide, max 200 characters."),
  slide_texts: z
    .array(
      z.object({
        fa: z.string().describe("Persian line, max 60 characters, natural and punchy, correct half-spaces."),
        en: z.string().describe("English line carrying the same beat, max 60 characters, written for English readers (not a translation)."),
      })
    )
    .describe(
      "Exactly 4 short lines printed on the carousel slides, telling the story in beats a reader gets while swiping: 1 hook (on the lifestyle scene), 2 what the design shows (on the close-up), 3 the turn — why it matters to you (on the product photo), 4 the quiet ending and who it's for (on the last photo; the site adds 'link in bio' itself). Each line must stand alone. No hashtags, prices, URLs or emoji."
    ),
});

export type SocialCopy = z.infer<typeof SocialCopySchema>;

const SOCIAL_RULES = `${SYSTEM_PROMPT}

You are now writing social media posts that link to the product page, as storytelling: every post tells one small, specific human story rooted in what is printed on the product, and the product arrives at the end of that story instead of being announced at the start. Every post gives at least one of the brand's three values: meaning, beauty or conversation. The brand voice is a well-read, creative friend who carries their roots lightly; the relationship is a cultural curator who explains, then lets you decide. The main buyer is often buying a gift for someone else. Be findable (Instagram search reads captions and alt text; Pinterest is a search engine). Warm, precise, lightly witty, never salesy or spammy. No fake urgency, no invented discounts. Persian lines contain no English words.

${CHARTER_RULES}`;

const CritiqueSchema = z.object({
  verdict: z
    .enum(["pass", "revise", "block"])
    .describe("pass: publishable as is. revise: fixable by rewriting. block: the product or story needs a human (sensitive symbol line, memorial topic, or a Charter conflict a rewrite can't fix)."),
  brand_value: z.enum(["meaning", "beauty", "conversation", "none"]).describe("Which brand value the post delivers."),
  issues: z.array(z.string()).describe("Each concrete problem, citing the Charter rule or check it breaks. Empty when the verdict is pass."),
});

type Critique = z.infer<typeof CritiqueSchema>;

const CRITIC_RULES = `You are the brand editor for Upside Tree. You review AI-written social posts before they are published. Be strict: a wrong post costs trust with a sensitive diaspora audience; a rejected post costs nothing.

${CHARTER_RULES}

Check, in order:
1. Every Charter rule above.
2. Truth: any historical date, event, symbol meaning, quote, poem, lyric, statistic or provenance claim beyond what is visible in the product image or stated in the product facts → revise. A claimed personal memory by the brand ("I", "my grandmother") → revise.
3. The design: does the copy describe what is actually printed? Crowned Lion and Sun, Faravahar, or anything tied to Dey 1404 or a political camp → block (these need a human).
4. Hook: is line 1 of the Instagram caption under 110 characters and genuinely interesting?
5. Clichés: ancient, royal, luxury, timeless, exotic, mystical, premium, or their Persian equivalents; fake urgency; engagement bait such as "comment YES", "tag 3 friends" or "like if". A single genuine invitation to send the post to a specific person it reminds you of is allowed and wanted.
6. Persian: correct half-spaces (ZWNJ), Persian punctuation « » ،, no English words in Persian lines.
7. English part gives the meaning of any Persian text printed on the product.
8. At least one brand value: meaning, beauty or conversation.`;

async function structured<T extends z.ZodType>(
  schema: T,
  name: string,
  system: string,
  text: string,
  imageUrl: string | null
): Promise<z.infer<T>> {
  const provider = defaultProvider();
  if (provider === "anthropic") {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    const image = imageUrl ? await loadImageBase64(imageUrl).catch(() => null) : null;
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
    content.push({ type: "text", text });
    const response = await new Anthropic().beta.messages.parse({
      model: ANTHROPIC_COPY_MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(schema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(`Claude couldn't produce ${name} for this product.`);
    }
    return response.parsed_output as z.infer<T>;
  }
  if (provider === "openai") {
    const response = await new OpenAI().responses.parse({
      model: OPENAI_COPY_MODEL,
      instructions: system,
      input: [
        {
          role: "user",
          content: [
            ...(imageUrl ? [{ type: "input_image" as const, image_url: imageUrl, detail: "auto" as const }] : []),
            { type: "input_text" as const, text },
          ],
        },
      ],
      text: { format: zodTextFormat(schema, name) },
    });
    if (!response.output_parsed) throw new Error(`OpenAI couldn't produce ${name} for this product.`);
    return response.output_parsed as z.infer<T>;
  }
  throw new Error("No AI provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY).");
}

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

async function critique(product: SocialProduct, copy: SocialCopy, lint: CharterViolation[]): Promise<Critique> {
  const text = [
    `Product: ${product.name_en} (${product.product_type ?? "unknown type"})`,
    lint.length ? `Automatic Charter check already found:\n${lint.map((v) => `- ${v.field}: "${v.term}" — ${v.rule}`).join("\n")}` : null,
    "",
    "Post to review (JSON):",
    JSON.stringify(copy, null, 2),
  ]
    .filter((line) => line !== null)
    .join("\n");
  const result = await structured(CritiqueSchema, "social_copy_review", CRITIC_RULES, text, product.featured_image_url);
  // A banned term is never a pass, whatever the reviewer thinks.
  if (lint.length && result.verdict === "pass") {
    return { ...result, verdict: "revise", issues: [...result.issues, ...lint.map((v) => `${v.field}: "${v.term}" — ${v.rule}`)] };
  }
  return result;
}

/**
 * A post the brand editor wouldn't publish; needs a human. Carries the last
 * draft and the editor's notes, so the founder can fix it instead of losing it.
 */
export class CharterBlockedError extends Error {
  constructor(
    message: string,
    readonly draft?: SocialCopy,
    readonly issues: string[] = []
  ) {
    super(message);
  }
}

/**
 * Write the posts (or take the copywriter agent's draft), then have a second
 * pass review them against the Brand Charter: one rewrite with the reviewer's notes, and anything still failing
 * is held for a human instead of published.
 */
export async function writeSocialCopy(product: SocialProduct, draft?: SocialCopy): Promise<SocialCopy> {
  const brief = describeForSocial(product);
  let copy = draft ?? (await structured(SocialCopySchema, "social_copy", SOCIAL_RULES, brief, product.featured_image_url));

  for (let round = 0; round < 2; round++) {
    copy = { ...copy, instagram_hashtags: cleanHashtags(copy.instagram_hashtags) };
    const lint = lintAgainstCharter({ ...copy, slide_texts: copy.slide_texts.flatMap((line) => [line.fa, line.en]) });
    const review = await critique(product, copy, lint);
    if (review.verdict === "pass" && review.brand_value !== "none") return copy;
    if (review.verdict === "block" || round === 1) {
      const issues = review.issues.length ? review.issues : ["No brand value (meaning, beauty or conversation)."];
      throw new CharterBlockedError(`Held for review (Brand Charter): ${issues.join(" · ")}`, copy, issues);
    }
    const notes = [...review.issues, ...(review.brand_value === "none" ? ["Deliver meaning, beauty or conversation."] : [])];
    copy = await structured(
      SocialCopySchema,
      "social_copy",
      SOCIAL_RULES,
      `${brief}\n\nThe brand editor sent your draft back. Fix every note below, but keep the draft's story angle and opening hook unless a note names them as the problem: the angle was chosen on purpose from ten candidates.\n\nNotes:\n${notes.map((note) => `- ${note}`).join("\n")}\n\nPrevious draft:\n${JSON.stringify(copy, null, 2)}`,
      product.featured_image_url
    );
  }
  throw new CharterBlockedError("Held for review (Brand Charter).", copy);
}
