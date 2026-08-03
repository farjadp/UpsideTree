import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function isMissingMediaLibraryError(error?: { message?: string | null; code?: string | null } | null) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "PGRST205" ||
    message.includes("media_library") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation \"media_library\" does not exist")
  );
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function buildPrompt({
  nameEn,
  nameFa,
  promptHint,
}: {
  nameEn: string;
  nameFa: string;
  promptHint: string;
}) {
  const fallbackPrompt = `Premium ecommerce collection banner for Upside Tree. Subject: ${nameEn || nameFa || "collection"}. Style: refined editorial product-shot on a warm ivory background, soft daylight, minimal museum-shop styling, generous negative space, no text. Focus on an elegant folded product or symbolic category composition inspired by Persian heritage. ${promptHint || ""}`.trim();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackPrompt;
  }

  const systemPrompt = `You write concise production-ready prompts for premium ecommerce image generation.
Return only the final image prompt, no explanation.
Brand: Upside Tree, a contemporary Iranian cultural brand.
Prompt goals: tasteful, minimal, premium, product-led, no text inside the image.`;

  const userPrompt = `Write one image-generation prompt for a collection cover image.
Collection name EN: ${nameEn || "N/A"}
Collection name FA: ${nameFa || "N/A"}
Optional creative direction: ${promptHint || "none"}
Requirements:
- horizontal banner image
- premium ecommerce art direction
- warm ivory background
- elegant negative space
- suitable for a product collection page
- no text, no watermark
- culturally grounded but contemporary
- if the category suggests apparel, allow a folded product-shot composition
- avoid religious symbols, flags, and cliché orientalist styling`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    return fallbackPrompt;
  }

  const data = await response.json();
  return data?.content?.[0]?.text?.trim() || fallbackPrompt;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const { name_en, name_fa, prompt_hint } = await request.json();

    if (!name_en?.trim() && !name_fa?.trim()) {
      return NextResponse.json({ error: "Collection name is required before generating an image." }, { status: 400 });
    }

    const prompt = await buildPrompt({
      nameEn: name_en || "",
      nameFa: name_fa || "",
      promptHint: prompt_hint || "",
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json({ error: "Image generation returned no image data." }, { status: 500 });
    }

    const buffer = Buffer.from(b64, "base64");
    const adminClient = getAdminClient();

    const { data: buckets } = await adminClient.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === "media-library");

    if (!bucketExists) {
      const { error: bucketError } = await adminClient.storage.createBucket("media-library", {
        public: true,
        fileSizeLimit: 8 * 1024 * 1024,
      });

      if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: bucketError.message }, { status: 500 });
      }
    }

    const fileName = `${Date.now()}-${(name_en || name_fa || "collection").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    const filePath = `collections/${fileName}`;

    const { error: uploadError } = await adminClient.storage
      .from("media-library")
      .upload(filePath, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = adminClient.storage.from("media-library").getPublicUrl(filePath);

    const { error: mediaInsertError } = await adminClient.from("media_library").insert({
      filename: fileName,
      original_name: fileName,
      url: publicUrl,
      thumbnail_url: publicUrl,
      file_type: "image",
      mime_type: "image/png",
      size_bytes: buffer.byteLength,
      alt_text_en: `AI generated collection cover for ${name_en || name_fa || "collection"}`,
      alt_text_fa: name_fa || "",
      folder: "collections",
      uploaded_by: user.id,
    });

    if (mediaInsertError && !isMissingMediaLibraryError(mediaInsertError)) {
      return NextResponse.json({ error: mediaInsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      url: publicUrl,
      prompt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate collection image" }, { status: 500 });
  }
}
