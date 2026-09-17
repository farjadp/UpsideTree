import "server-only";

import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialProduct } from "@/lib/social/types";

// Overridable so a newer image model can be used without a code change.
const SOCIAL_IMAGE_MODEL = process.env.SOCIAL_IMAGE_MODEL || "gpt-image-2";
// 4:5 portrait: the tallest ratio Instagram accepts in feed, and a good pin shape.
// Every carousel slide uses it, since Instagram crops slides to the first one.
const SOCIAL_IMAGE_SIZE = "1216x1520";
const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;
const IVORY = "#F4EFE3";
const BUCKET = "media-library";

export type SocialShot = "hero" | "detail";

const FRAMING: Record<SocialShot, string> = {
  hero: "The product is the clear hero of the frame, sharp and fully visible.",
  detail:
    "A close-up: the printed design is sharp and fills a large part of the frame. Cropping the product's edges is fine; cropping or distorting the printed design is not.",
};

// The product name is left out on purpose: supplier titles can describe a
// different design than the one printed, and the image model follows words.
function brandPrompt(scene: string, shot: SocialShot) {
  return `Create a high-quality social media photo for Upside Tree, a contemporary Iranian design brand.

THE PRODUCT (most important):
The reference image shows the product. Reproduce this exact product faithfully: the same printed artwork, colours, typography, text and proportions. Do not redraw, simplify, translate, mirror or restyle the design. Do not add any design to the product that isn't in the reference. ${FRAMING[shot]}

SCENE:
${scene}

BRAND LOOK:
- Palette: warm ivory backgrounds and surfaces dominate; deep lapis blue (#1D4E89) and ink as secondary tones; small touches of matte gold (#B48635) and pomegranate red (#8C2F39) as accents only.
- Contemporary editorial lifestyle photography, natural soft daylight, gentle shadows, shallow depth of field, tactile materials (linen, clay, walnut, paper, brass).
- Iranian references are subtle and modern when used: a glass of tea, a pomegranate, a folded termeh or kilim, a corner of a Persian carpet, a khatam box. Never costume-like, never kitsch, no "ancient palace" or luxury-gold clichés.
- No political flags, emblems or slogans beyond what is printed on the product.
- Vertical 4:5 composition.

SETTING (house style):
- An Iranian home in a Canadian city: kitchen, living room, hallway, balcony or window seat, in warm daylight. A city view through a window is welcome; studio backdrops and shop displays are not.
- The room is lived in, not staged: keep props few (two at most) and let plain surfaces carry the frame.

PEOPLE:
- When a person appears, they are Iranian: Persian/Iranian features, black or dark brown hair, warm olive to light brown skin, dark eyes, groomed contemporary style. Women wear their hair uncovered. Ages 20-45, relaxed and natural, never a stock-photo smile, never a model pose.
- They are ordinary people at home, dressed in today's clothes; nobody is in costume or traditional dress.
- One person in the frame, alone: no second person, no bystander at the edge.
- Invent the face: it must not resemble any real, identifiable person.

ABSOLUTELY NO ISLAMIC OR RELIGIOUS ELEMENTS (hard rule, brand-defining):
- No hijab, headscarf, chador, maghnaeh, veil, turban, keffiyeh or clerical robe on anyone; no hair covering of any kind.
- No mosque, dome, minaret, mihrab, shrine, madrasa or any religious building, in the scene or through a window.
- No Islamic ornament: no girih, arabesque, muqarnas, or mosque-style blue tilework.
- No prayer objects: no prayer rug, prayer beads, mohr, Quran or any religious book.
- No Arabic script anywhere, and no religious calligraphy of any kind.
- No crescent, star-and-crescent or any religious symbol; no Ramadan, Eid, Muharram or any religious occasion.

DO NOT:
- Add any text, captions, logos, watermarks, prices or UI elements to the image.
- Change the product into a different product type.`;
}

async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Couldn't download ${url} (${response.status}).`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    type: response.headers.get("content-type")?.split(";")[0].trim() ?? "image/png",
  };
}

export async function uploadSocialImage(supabase: SupabaseClient, product: SocialProduct, name: string, bytes: Buffer) {
  const filePath = `social/${product.slug}-${Date.now()}-${name}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, bytes, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Uploading the social image failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

/** Generate a branded AI scene from the product photo and store it publicly. */
export async function createSocialImage(
  supabase: SupabaseClient,
  product: SocialProduct,
  scene: string,
  shot: SocialShot = "hero"
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (!product.featured_image_url) throw new Error("Product has no featured image to build from.");

  const reference = await download(product.featured_image_url);
  if (!["image/png", "image/jpeg", "image/webp"].includes(reference.type)) {
    throw new Error(`Product image type ${reference.type} isn't supported for image generation.`);
  }
  const extension = reference.type === "image/jpeg" ? "jpg" : reference.type.split("/")[1];

  const params = {
    model: SOCIAL_IMAGE_MODEL,
    image: await toFile(reference.bytes, `product.${extension}`, { type: reference.type }),
    prompt: brandPrompt(scene, shot),
    size: SOCIAL_IMAGE_SIZE,
    quality: "high" as const,
    output_format: "jpeg" as const,
    output_compression: 90,
  };

  // gpt-image-2 always works at high fidelity and rejects the parameter;
  // older GPT image models need it to keep the printed artwork intact.
  const result = await new OpenAI().images.edit(
    SOCIAL_IMAGE_MODEL.startsWith("gpt-image-2") ? params : { ...params, input_fidelity: "high" }
  );

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image generation returned no image.");
  return uploadSocialImage(supabase, product, shot, Buffer.from(b64, "base64"));
}

/**
 * A real product photo, fitted onto a 4:5 ivory frame as a JPEG. Supplier
 * mockups are square (and sometimes PNG/WebP), which Instagram would crop
 * or reject inside a 4:5 carousel.
 */
export async function frameProductPhoto(
  supabase: SupabaseClient,
  product: SocialProduct,
  url: string,
  name: string
): Promise<string> {
  const { bytes } = await download(url);
  const flat = await sharp(bytes).flatten({ background: IVORY }).toColourspace("srgb").toBuffer();
  // Mockups sit on a plain studio backdrop: extend that colour to fill the
  // frame so the photo doesn't look like a pasted box.
  const { data: corner } = await sharp(flat).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const background = { r: corner[0], g: corner[1], b: corner[2] };

  const framed = await sharp(flat)
    .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: "contain", background })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return uploadSocialImage(supabase, product, name, framed);
}
