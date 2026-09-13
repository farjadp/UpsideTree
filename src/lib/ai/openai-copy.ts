import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  AiDraftError,
  DraftSchema,
  SYSTEM_PROMPT,
  describeProduct,
  type ProductCopyDraft,
  type ProductFacts,
} from "@/lib/ai/product-copy";

// Overridable so the model can be changed without a deploy of new code.
export const OPENAI_COPY_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.4";

export async function draftWithOpenAI(facts: ProductFacts): Promise<ProductCopyDraft> {
  const client = new OpenAI();

  try {
    const response = await client.responses.parse({
      model: OPENAI_COPY_MODEL,
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: [
            ...(facts.image_url
              ? [{ type: "input_image" as const, image_url: facts.image_url, detail: "auto" as const }]
              : []),
            { type: "input_text" as const, text: describeProduct(facts) },
          ],
        },
      ],
      text: { format: zodTextFormat(DraftSchema, "product_copy_draft") },
    });

    if (!response.output_parsed) {
      throw new AiDraftError(422, "OpenAI couldn't draft copy for this product.");
    }
    return response.output_parsed;
  } catch (error) {
    if (error instanceof AiDraftError) throw error;
    if (error instanceof OpenAI.RateLimitError) throw new AiDraftError(429, "OpenAI is rate limited. Try again in a minute.");
    if (error instanceof OpenAI.AuthenticationError) throw new AiDraftError(503, "OPENAI_API_KEY is invalid.");
    if (error instanceof OpenAI.NotFoundError) {
      throw new AiDraftError(503, `OpenAI model "${OPENAI_COPY_MODEL}" isn't available to this key. Set OPENAI_TEXT_MODEL.`);
    }
    if (error instanceof OpenAI.BadRequestError) {
      console.error("OpenAI draft bad request:", error.message);
      throw new AiDraftError(400, "OpenAI rejected the request. Check the product image URL.");
    }
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI draft API error ${error.status}:`, error.message);
      throw new AiDraftError(502, "OpenAI service error. Try again shortly.");
    }
    throw error;
  }
}
