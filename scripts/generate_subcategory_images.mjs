// ============================================================================
// File: scripts/generate_subcategory_images.mjs
// Why: Generate a brand-consistent cover image for every active SUBCATEGORY
//      (collection with a parent_id) using gpt-image-1, in the same warm
//      ivory / museum-shop style as the main category covers, and store them
//      in the media-library bucket with cover_image_url set on each row.
//
// Run:  node scripts/generate_subcategory_images.mjs
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

const BRAND_STYLE =
  "Refined editorial e-commerce cover for Upside Tree, a contemporary Iranian heritage brand. " +
  "Warm ivory background (#F4EFE3), soft natural daylight, generous negative space, museum-shop minimalism, premium and tasteful. " +
  "Subtle accents of lapis blue (#1D4E89), antique gold (#B48635), and pomegranate red (#8C2F39). " +
  "Motifs limited to pre-Islamic Persian visual language: geometric patterns, Persepolis column details, cuneiform texture, Simorgh feathers. " +
  "Horizontal 16:9 composition. No text, no logos, no watermark, no people’s faces, no religious symbols, no flags, no cliché orientalist styling.";

function describeSubcategory(mainEn, mainFa, subEn) {
  const main = mainEn.toLowerCase();
  const sub = subEn.toLowerCase();
  const base = `A premium product cover for "${subEn}" under "${mainEn}". `;

  // Apparel
  if (["t-shirts", "sweatshirts", "hoodies", "long sleeves", "tank tops", "sportswear", "bottoms", "swimwear", "outerwear", "shoes", "skirts & dresses", "baby clothing"].some((k) => sub.includes(k))) {
    return base + `A neatly arranged, folded or styled "${subEn}" garment in ivory, lapis or pomegranate tones, with a subtle Persian geometric or calligraphic motif near the hem or chest. Clean flat-lay. `;
  }

  // Accessories
  if (["jewelry", "phone cases", "bags", "socks", "hats", "underwear", "baby accessories", "mouse pads", "car accessories", "tech accessories", "travel accessories", "stationery accessories", "face masks"].some((k) => sub.includes(k))) {
    return base + `A curated close-up of "${subEn}" items arranged with generous spacing, showing subtle Persian metalwork, leather, or geometric patterns. `;
  }

  // Home
  if (["mugs", "candles", "ornaments", "seasonal decorations", "glassware", "bottles & tumblers", "canvas", "posters", "postcards", "journals & notebooks", "magnets & stickers", "home decor", "blankets", "pillows & covers", "towels", "bathroom", "rugs & mats", "bedding"].some((k) => sub.includes(k))) {
    return base + `A serene home still-life of "${subEn}" objects on a warm ivory surface, lit by soft daylight, with a quiet Persian motif integrated in the object or background. `;
  }

  // Other / Pets / Books / Sports & Games / Kitchen
  if (["books", "pets", "sports & games", "kitchen accessories"].some((k) => sub.includes(k))) {
    return base + `A minimal product arrangement of "${subEn}" items in the Upside Tree style, warm ivory and lapis-gold accents, Persian geometric detail. `;
  }

  return base + `A minimal, premium product arrangement for "${subEn}" in the Upside Tree visual style. `;
}

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

async function main() {
  const { data: subcategories, error } = await supabase
    .from("collections")
    .select("id, slug, name_en, name_fa, cover_image_url, parent_id, parent:parent_id(name_en, name_fa)")
    .not("parent_id", "is", null)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  const missing = subcategories.filter((sub) => !sub.cover_image_url);
  if (missing.length === 0) {
    console.log("All subcategories already have cover images.");
    return;
  }
  console.log(`Found ${missing.length} subcategories missing cover images.`);

  await ensureBucket();

  for (const sub of missing) {
    const main = sub.parent;
    const subject = describeSubcategory(main.name_en, main.name_fa, sub.name_en);
    const prompt = `${subject} ${BRAND_STYLE}`;

    console.log(`[${sub.slug}] generating...`);
    try {
      const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1536x1024",
      });
      const b64 = imageResponse.data?.[0]?.b64_json;
      if (!b64) throw new Error("no image data");

      const buffer = Buffer.from(b64, "base64");
      const fileName = `${Date.now()}-subcategory-${sub.slug}.png`;
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
        alt_text_en: `AI generated cover for ${sub.name_en}`,
        alt_text_fa: sub.name_fa || "",
        folder: "collections",
      });
      if (mediaError) console.warn(`media_library warning: ${mediaError.message}`);

      const { error: updateError } = await supabase
        .from("collections")
        .update({ cover_image_url: publicUrl, banner_image_url: publicUrl })
        .eq("id", sub.id);
      if (updateError) throw updateError;

      console.log(`  done: ${publicUrl}`);
    } catch (err) {
      console.error(`  failed for ${sub.slug}: ${err.message}`);
    }
  }

  console.log("\nSubcategory image generation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
