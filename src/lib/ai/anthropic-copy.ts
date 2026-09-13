import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  AiDraftError,
  DraftSchema,
  SYSTEM_PROMPT,
  describeProduct,
  type ProductCopyDraft,
  type ProductFacts,
} from "@/lib/ai/product-copy";

export const ANTHROPIC_COPY_MODEL = "claude-opus-5";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Fetch the product image ourselves and send it inline. With a URL source
// Anthropic downloads the image from its own servers, which the supplier's
// image host can refuse — that surfaced as a 400 on a live product while
// OpenAI (fetching the same URL) worked. A failed download just means the
// draft is written without the image.
async function loadImage(url: string): Promise<Anthropic.Beta.BetaImageBlockParam | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const mediaType = response.headers.get("content-type")?.split(";")[0].trim() as ImageMediaType | undefined;
    if (!mediaType || !IMAGE_TYPES.includes(mediaType)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
    return { type: "image", source: { type: "base64", media_type: mediaType, data: bytes.toString("base64") } };
  } catch {
    return null;
  }
}

export async function draftWithAnthropic(facts: ProductFacts): Promise<ProductCopyDraft> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = facts.image_url ? await loadImage(facts.image_url) : null;
  if (image) content.push(image);
  content.push({ type: "text", text: describeProduct(facts) });

  const client = new Anthropic();
  const baseParams = {
    model: ANTHROPIC_COPY_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content }],
    output_config: { format: betaZodOutputFormat(DraftSchema) },
  };

  const run = (withFallbacks: boolean) =>
    client.beta.messages.parse(
      withFallbacks
        ? {
            ...baseParams,
            // If a safety classifier declines, the API retries on Anthropic's
            // recommended fallback model instead of returning a refusal.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default" as const,
          }
        : baseParams
    );

  try {
    let response;
    try {
      response = await run(true);
    } catch (error) {
      // Refusal fallbacks are optional; if the API rejects that parameter for
      // this account or request shape, draft without it rather than fail.
      if (error instanceof Anthropic.BadRequestError && /fallback/i.test(error.message)) {
        console.warn("Anthropic draft: fallbacks rejected, retrying without:", error.message);
        response = await run(false);
      } else {
        throw error;
      }
    }

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new AiDraftError(422, "Claude couldn't draft copy for this product.");
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof AiDraftError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw new AiDraftError(429, "Claude is rate limited. Try again in a minute.");
    if (error instanceof Anthropic.AuthenticationError) throw new AiDraftError(503, "ANTHROPIC_API_KEY is invalid.");
    if (error instanceof Anthropic.PermissionDeniedError) {
      throw new AiDraftError(503, `Claude access denied for this key: ${error.message}`);
    }
    if (error instanceof Anthropic.BadRequestError) {
      // Admin-only endpoint: show the API's own reason so it can be fixed.
      console.error("Anthropic draft bad request:", error.message);
      throw new AiDraftError(400, `Claude rejected the request: ${error.message}`);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic draft API error ${error.status}:`, error.message);
      throw new AiDraftError(502, `Claude service error (${error.status}). Try again shortly.`);
    }
    throw error;
  }
}
