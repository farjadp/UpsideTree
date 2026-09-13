import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  AiDraftError,
  ProductFactsSchema,
  configuredProviders,
  defaultProvider,
  type AiProvider,
} from "@/lib/ai/product-copy";
import { ANTHROPIC_COPY_MODEL, draftWithAnthropic } from "@/lib/ai/anthropic-copy";
import { OPENAI_COPY_MODEL, draftWithOpenAI } from "@/lib/ai/openai-copy";

// Drafts product copy from the product's real facts (title, specs, type,
// collection, options, main image) with Claude or OpenAI. Both use the same
// instructions and output shape so drafts can be compared side by side.
// Nothing is saved here; the admin reviews and edits in the editor.

export const maxDuration = 120;

const MODELS: Record<AiProvider, string> = {
  anthropic: ANTHROPIC_COPY_MODEL,
  openai: OPENAI_COPY_MODEL,
};

const RequestSchema = ProductFactsSchema.extend({
  provider: z.enum(["anthropic", "openai"]).optional(),
});

/** Which providers have keys, so the editor knows whether to offer a comparison. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const providers = configuredProviders();
  return NextResponse.json({
    providers: providers.map((id) => ({ id, model: MODELS[id] })),
    default: defaultProvider(),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product details for AI drafting." }, { status: 400 });
  }
  const { provider: requested, ...facts } = parsed.data;

  const provider = requested ?? defaultProvider();
  if (!provider || !configuredProviders().includes(provider)) {
    const key = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    return NextResponse.json(
      { error: provider ? `${key} isn't set.` : "AI drafting isn't configured: set ANTHROPIC_API_KEY or OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const draft = provider === "openai" ? await draftWithOpenAI(facts) : await draftWithAnthropic(facts);
    return NextResponse.json({ provider, model: MODELS[provider], draft });
  } catch (error) {
    if (error instanceof AiDraftError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`AI draft (${provider}) failed:`, error);
    return NextResponse.json({ error: "AI drafting failed." }, { status: 500 });
  }
}
