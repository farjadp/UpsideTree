import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

// Drafts every piece of product copy in one call, from what the product
// actually is: its title, the specs we already hold (usually Printify's
// description), type, collection, options and its main image. The admin
// reviews and edits the draft; nothing is saved from here.

export const maxDuration = 120;

const MODEL = "claude-opus-5";

const DraftSchema = z.object({
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

const RequestSchema = z.object({
  name_en: z.string().max(300).default(""),
  name_fa: z.string().max(300).default(""),
  product_type: z.string().max(60).default(""),
  collection: z.string().max(200).default(""),
  specs: z.string().max(8000).default(""),
  options: z.array(z.string().max(200)).max(80).default([]),
  image_url: z.string().url().max(2000).optional().or(z.literal("")),
});

const SYSTEM_PROMPT = `You write product copy for Upside Tree, a Canadian store selling print-on-demand objects (apparel, canvas, mugs, stickers, bags) with contemporary Persian and Iranian designs, sold bilingually in English and Persian to the Iranian diaspora and people who love the culture.

Voice: rooted, warm, precise, contemporary. Plain words over ornament. Specific over grand.

Rules:
- Describe this specific design. Use the image to see what is actually printed; don't guess at artwork you can't see.
- Spec lines state only facts from the provided specs or clearly visible in the image. Never invent materials, sizes, certifications, origins or care instructions.
- Marketplace titles often carry keyword stuffing or off-brand words (e.g. seasonal or Halloween terms); write names that fit the actual design instead.
- Avoid clichés: "ancient", "royal", "luxury", "timeless", "exotic", "mystical". Don't exoticize.
- Persian is written natively, not translated word-for-word: standard modern Persian, correct half-spaces (ZWNJ) as in "می‌شود" and "ریشه‌ها", Persian punctuation « » and ،.
- Political or historical figures and symbols: describe them factually and respectfully without taking a political position.`;

function describeProduct(input: z.infer<typeof RequestSchema>) {
  return [
    `Current title: ${input.name_en || "(none)"}`,
    input.name_fa && input.name_fa !== input.name_en ? `Current Persian title: ${input.name_fa}` : null,
    `Product type: ${input.product_type || "unknown"}`,
    `Collection: ${input.collection || "none"}`,
    input.options.length ? `Available options: ${input.options.join("; ")}` : null,
    `Specs we hold (may be HTML from the supplier):\n${input.specs || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI drafting isn't configured: set ANTHROPIC_API_KEY in the environment." },
      { status: 503 }
    );
  }

  const parsedInput = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Invalid product details for AI drafting." }, { status: 400 });
  }
  const input = parsedInput.data;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.image_url) {
    content.push({ type: "image", source: { type: "url", url: input.image_url } });
  }
  content.push({
    type: "text",
    text: `Draft the full bilingual copy for this product.\n\n${describeProduct(input)}`,
  });

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(DraftSchema) },
      // If a safety classifier declines, the API retries on Anthropic's
      // recommended fallback model instead of returning a refusal.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json(
        { error: "The AI couldn't draft copy for this product. Try again, or write it manually." },
        { status: 422 }
      );
    }

    return NextResponse.json({ draft: response.parsed_output });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI is rate limited right now. Try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is invalid." }, { status: 503 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("AI draft bad request:", error.message);
      return NextResponse.json({ error: "AI request was rejected. Check the product image URL." }, { status: 400 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`AI draft API error ${error.status}:`, error.message);
      return NextResponse.json({ error: "AI service error. Try again shortly." }, { status: 502 });
    }
    console.error("AI draft failed:", error);
    return NextResponse.json({ error: "AI drafting failed." }, { status: 500 });
  }
}
