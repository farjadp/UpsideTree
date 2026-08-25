// ============================================================================
// File: scripts/generate_category_images.mjs
// Why: Generate one brand-consistent cover image per MAIN category
//      (Men, Women, Kids, Accessories, Home and Living) with gpt-image-1,
//      matching the art direction of the earlier AI collection covers
//      (Wall Art / Jewelry & Keepsakes / Drinkware): refined editorial
//      product-shot, warm ivory background, museum-shop minimalism, no text.
//
//      Uploads to the public `media-library` bucket (collections/ folder),
//      registers each file in media_library, and sets cover_image_url on
//      the matching collection row.
//
// Run:  node scripts/generate_category_images.mjs [slug ...]
//       (no args = all 5 main categories)
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ------------------------------------------------------------------
// Brand identity baked into every prompt (Upside Tree brand doc):
// warm ivory #F4EFE3 backdrop, lapis #1D4E89 / gold #B48635 /
// pomegranate #8C2F39 accents, pre-Islamic Persian heritage motifs,
// premium museum-shop minimalism, soft daylight, no text, no religious
// symbols, no flags, no cliché orientalism.
// ------------------------------------------------------------------

const BRAND_STYLE =
  "Refined editorial ecommerce photography for Upside Tree, a contemporary Iranian heritage brand. " +
  "Warm ivory background (#F4EFE3), soft natural daylight, generous negative space, museum-shop minimalism, premium and tasteful. " +
  "Subtle accents of lapis blue (#1D4E89), antique gold (#B48635), and pomegranate red (#8C2F39). " +
  "Motifs limited to pre-Islamic Persian visual language: geometric patterns, Persepolis column details, cuneiform texture, Simorgh feathers. " +
  "Horizontal composition. No text, no logos, no watermark, no people’s faces, no religious symbols, no flags, no cliché orientalist styling.";

const CATEGORIES = [
  {
    slug: "men",
    subject:
      "A neatly folded stack of premium menswear — a heavyweight ivory t-shirt, an ink-black hoodie, and a lapis-blue crewneck sweatshirt — the top tee showing a small embroidered Persian geometric lion motif in antique gold thread.",
  },
  {
    slug: "women",
    subject:
      "An elegant flat-lay of premium womenswear — a softly draped cream long-sleeve and a pomegranate-red sweatshirt with a delicate Simorgh feather line motif, styled with a thin gold chain resting beside the fabric.",
  },
  {
    slug: "kids",
    subject:
      "A playful yet minimal arrangement of small children's clothing — a tiny ivory t-shirt with a friendly geometric Persian lion print and a folded teal sweatshirt — beside a small wooden horse toy inspired by Shahnameh.",
  },
  {
    slug: "accessories",
    subject:
      "A curated flat-lay of accessories — a gold pendant necklace with a Persian geometric sun motif, a lapis-blue phone case, a natural canvas tote bag, and an ivory cap — arranged with generous spacing like a museum vitrine.",
  },
  {
    slug: "home-and-living",
    subject:
      "A serene home vignette — a ceramic mug with a lapis geometric band, a small framed canvas with an abstract Persepolis column illustration, a lit beeswax candle, and a folded ivory throw blanket with a subtle gold border.",
  },
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === "media-library")) {
    const { error } = await supabase.storage.createBucket("media-library", {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
    });
    if (error && !error.message.toLowerCase().includes("already exists")) throw error;
  }
}

async function generateFor(category) {
  const { data: collection, error } = await supabase
    .from("collections")
    .select("id, name_en, name_fa")
    .eq("slug", category.slug)
    .is("parent_id", null)
    .single();
  if (error || !collection) {
    console.error(`skip ${category.slug}: collection not found (run seed_categories.mjs first)`);
    return;
  }

  const prompt = `${category.subject} ${BRAND_STYLE}`;
  console.log(`generating image for "${collection.name_en}"...`);

  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1536x1024",
  });
  const b64 = imageResponse.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image data returned for ${category.slug}`);

  const buffer = Buffer.from(b64, "base64");
  const fileName = `${Date.now()}-category-${category.slug}.png`;
  const filePath = `collections/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("media-library")
    .upload(filePath, buffer, { contentType: "image/png", cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(filePath);

  const { error: mediaError } = await supabase.from("media_library").insert({
    filename: fileName,
    original_name: fileName,
    url: publicUrl,
    thumbnail_url: publicUrl,
    file_type: "image",
    mime_type: "image/png",
    size_bytes: buffer.byteLength,
    alt_text_en: `AI generated category cover for ${collection.name_en}`,
    alt_text_fa: collection.name_fa || "",
    folder: "collections",
  });
  if (mediaError) console.warn(`media_library insert warning (${category.slug}): ${mediaError.message}`);

  const { error: updateError } = await supabase
    .from("collections")
    .update({ cover_image_url: publicUrl, banner_image_url: publicUrl })
    .eq("id", collection.id);
  if (updateError) throw updateError;

  console.log(`  done: ${publicUrl}`);
}

async function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length
    ? CATEGORIES.filter((category) => requested.includes(category.slug))
    : CATEGORIES;

  await ensureBucket();
  for (const category of targets) {
    await generateFor(category);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
