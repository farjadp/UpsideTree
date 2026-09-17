import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ANTHROPIC_COPY_MODEL } from "@/lib/ai/anthropic-copy";
import { CHARTER_RULES, lintAgainstCharter } from "@/lib/social/charter";
import { SocialCopySchema, type SocialCopy } from "@/lib/social/copy";
import { APPROVED_POETS, searchLibrary } from "@/lib/social/library";
import type { SocialProduct } from "@/lib/social/types";

// The copywriter agent. Where the plain writer answers one prompt, this one
// works the way a copywriter does: looks at the product, reads what the brand
// posted lately, searches the classical library, writes ten angles, keeps
// three, drafts the best in full, and only then hands it to the brand editor
// (critique lives in copy.ts). The angles it rejected are returned too, so an
// admin can swap the winner for a runner-up.

export const CopywriterOutputSchema = z.object({
  angles: z
    .array(
      z.object({
        format: z.string().describe("Which storytelling format this angle uses (gift moment, contrast, wordplay, verse with source, behind the design, 'maybe you too', light wit, ...)."),
        line: z.string().describe("The angle in one Persian line, the way it would open the post."),
        why: z.string().describe("One English sentence: what makes it stop the scroll, and which brand value it delivers (meaning, beauty, conversation)."),
      })
    )
    .min(6)
    .max(12)
    .describe("Every angle you considered, including the ones you rejected."),
  chosen: z.number().int().describe("Index into angles of the one you wrote in full."),
  runners_up: z.array(z.number().int()).max(2).describe("Indexes of the two next-best angles."),
  verse: z
    .object({ fa: z.string(), source: z.string(), url: z.string(), en: z.string().describe("Our own English rendering, marked as such in the post.") })
    .nullable()
    .describe("The couplet used, copied verbatim from a library search result, or null when the post uses none."),
  copy: SocialCopySchema,
});

export type CopywriterOutput = z.infer<typeof CopywriterOutputSchema>;

const COPYWRITER_SYSTEM = `You are the senior copywriter at Upside Tree, a Canadian brand of contemporary objects with Iranian designs, sold to the Iranian diaspora and the people who love them. You grew up between Persian poetry and North American advertising. You write Persian like a native writer, not a translator, and English like a New York copy chief. Your standard is a line people screenshot.

Brand voice: rooted · creative · bold · precise · warm. A well-read, creative friend who carries their roots lightly. "Proud, not loud." The relationship with the reader is a cultural curator who explains and then steps back. Plain words over ornament, specific over grand. Light, situational wit is welcome; sentiment that tips into kitsch is not. Every post delivers at least one of: meaning, beauty, conversation.

Who you write for: first, Nazanin — a bilingual woman in her 30s or 40s in Toronto, LA or Vancouver who buys meaningful gifts for family, kids and non-Iranian friends and hates anything that looks like a souvenir shop. Second, Dara — second-generation, 20s, wears identity but not slogans, reads Persian poorly, so every Persian phrase on a product gets its English meaning. Many buyers are buying for someone else: write so the post is easy to send to that person.

How you work (do all of it, in order, using the tools):
1. Look at the product (get_product) and the brand's recent posts (recent_posts). Anything that repeats a recent angle is dead on arrival.
2. Search the library (search_library) for the design's subjects — the object, the symbol, the feeling — in two or three different words. Read what comes back. Use a couplet only if it genuinely lifts the post; most posts don't need one.
3. Write TEN angles, each from a different format, each a single Persian line that could open the post. Kill the generic ones ("a stranger recognises it", "for the one who loves Iran quietly", "wear your roots") — those are the model's defaults, not yours.
4. Score them honestly: hook strength, brand value, sendability, freshness. Choose one. Name two runners-up.
5. Write the chosen angle in full: caption, four slide lines, Telegram, Pinterest, scenes, alt text.

Craft rules:
- The first line is a hook: a scene, a turn of phrase, a small surprise — under 110 characters. Never a statement of what the product is.
- Slide lines are four beats of one story (hook → what the design shows → the turn → the quiet ending). Each must stand alone and be worth a screenshot. No inventories of the design's parts.
- English lines are written for English readers, not translated. Any Persian on the product is given in English somewhere in the post.
- Verse: only verbatim from search_library, with its source, never from memory; skip any couplet with religious reference; at most one couplet; give your own English rendering.
- No claimed personal memories by the brand: narrate as "we" or "you", or write about a person in the reader's life.
- No hashtags, prices, URLs or emoji in slide lines. Caption: 0-3 emoji, no hashtags, no price, no URL; hashtags go in their own field (exactly 4, at least 3 Persian, all specific to this post).

${CHARTER_RULES}

Until the Symbol Registry exists you make no historical or symbolic claim beyond what is visible on the product and the facts given; the library gives you verse, not history.

Finish by calling submit_copy exactly once with everything.`;

type Deps = { supabase: SupabaseClient; forcedAngle?: string | null };

function productBrief(product: SocialProduct) {
  const strip = (html: string | null) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    name_en: product.name_en,
    name_fa: product.name_fa,
    product_type: product.product_type,
    emotional_line: strip(product.desc_emotional_en) || null,
    story_en: strip(product.desc_story_en) || null,
    story_fa: strip(product.desc_story_fa) || null,
    specs: strip(product.desc_functional_en).slice(0, 1200) || null,
    seo_keywords: product.seo_keywords ?? [],
    note: "Trust the image over the supplier title if they disagree.",
  };
}

async function recentPosts(supabase: SupabaseClient, excludeProductId: string) {
  const { data } = await supabase
    .from("social_assets")
    .select("copy, updated_at, products(name_en)")
    .neq("product_id", excludeProductId)
    .not("copy", "is", null)
    .order("updated_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((row) => {
    const copy = row.copy as Partial<SocialCopy> | null;
    const product = row.products as unknown as { name_en: string } | null;
    return {
      product: product?.name_en ?? "?",
      angle: copy?.story_angle ?? "",
      hook: copy?.instagram_caption?.split("\n")[0] ?? "",
    };
  });
}

async function loadImage(url: string): Promise<Anthropic.Beta.BetaImageBlockParam | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const mediaType = response.headers.get("content-type")?.split(";")[0].trim();
    if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) return null;
    return { type: "image", source: { type: "base64", media_type: mediaType, data: bytes.toString("base64") } };
  } catch {
    return null;
  }
}

/** Run the copywriter on one product. Throws if it never submits. */
export async function runCopywriter(product: SocialProduct, { supabase, forcedAngle }: Deps): Promise<CopywriterOutput> {
  let submitted: CopywriterOutput | null = null;

  const tools = [
    betaZodTool({
      name: "get_product",
      description: "The product facts as the store holds them.",
      inputSchema: z.object({}),
      run: () => JSON.stringify(productBrief(product)),
    }),
    betaZodTool({
      name: "recent_posts",
      description: "The brand's 30 most recent posts: product, story angle and opening line. Do not repeat these angles.",
      inputSchema: z.object({}),
      run: async () => JSON.stringify(await recentPosts(supabase, product.id)),
    }),
    betaZodTool({
      name: "search_library",
      description: `Search classical Persian poetry (Ganjoor) for couplets containing a word. Poets: ${Object.keys(APPROVED_POETS).join(", ")}. Returns verbatim couplets with exact sources; quote only from these.`,
      inputSchema: z.object({
        term: z.string().describe("A single Persian word or short phrase, e.g. شیر, خورشید, سرو, انار, وطن."),
        poets: z.array(z.string()).optional().describe("Restrict to these poets; default all."),
      }),
      run: async ({ term, poets }) => {
        const hits = await searchLibrary(term, poets?.length ? poets : undefined);
        return hits.length ? JSON.stringify(hits) : `No couplets containing "${term}" in the approved poets.`;
      },
    }),
    betaZodTool({
      name: "submit_copy",
      description: "Hand in the finished work. Call exactly once, at the end.",
      inputSchema: CopywriterOutputSchema,
      run: (output) => {
        const lint = lintAgainstCharter({
          ...output.copy,
          slide_texts: output.copy.slide_texts.flatMap((line) => [line.fa, line.en]),
          verse: output.verse ? [output.verse.fa, output.verse.en] : [],
        });
        if (lint.length) {
          return `Rejected by the Charter check — fix and submit again:\n${lint.map((v) => `- ${v.field}: "${v.term}" — ${v.rule}`).join("\n")}`;
        }
        submitted = output;
        return "Accepted.";
      },
    }),
  ];

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = product.featured_image_url ? await loadImage(product.featured_image_url) : null;
  if (image) content.push(image);
  content.push({
    type: "text",
    text: forcedAngle
      ? `Write this product's social posts. Product: ${product.name_en}. The founder has already chosen the angle from your earlier list; write THIS one in full and do not pick another: «${forcedAngle}». Still use get_product and search_library, list the angle you were given as the chosen one, then submit_copy.`
      : `Write this product's social posts. Product: ${product.name_en}. Work through your process with the tools, then submit_copy.`,
  });

  const runner = new Anthropic().beta.messages.toolRunner({
    model: ANTHROPIC_COPY_MODEL,
    max_tokens: 16000,
    max_iterations: 14,
    system: COPYWRITER_SYSTEM,
    tools,
    messages: [{ role: "user", content }],
  });
  await runner.runUntilDone();

  if (!submitted) throw new Error("The copywriter finished without submitting copy.");
  return submitted;
}
