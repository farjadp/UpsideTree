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

export async function draftWithAnthropic(facts: ProductFacts): Promise<ProductCopyDraft> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (facts.image_url) {
    content.push({ type: "image", source: { type: "url", url: facts.image_url } });
  }
  content.push({ type: "text", text: describeProduct(facts) });

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.parse({
      model: ANTHROPIC_COPY_MODEL,
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
      throw new AiDraftError(422, "Claude couldn't draft copy for this product.");
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof AiDraftError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw new AiDraftError(429, "Claude is rate limited. Try again in a minute.");
    if (error instanceof Anthropic.AuthenticationError) throw new AiDraftError(503, "ANTHROPIC_API_KEY is invalid.");
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Anthropic draft bad request:", error.message);
      throw new AiDraftError(400, "Claude rejected the request. Check the product image URL.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic draft API error ${error.status}:`, error.message);
      throw new AiDraftError(502, "Claude service error. Try again shortly.");
    }
    throw error;
  }
}
