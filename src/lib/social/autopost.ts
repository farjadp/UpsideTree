import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { blackoutReason } from "@/lib/social/charter";
import { CharterBlockedError, SocialCopySchema, writeSocialCopy, type SocialCopy } from "@/lib/social/copy";
import { createSocialImage, frameProductPhoto } from "@/lib/social/image";
import { isInstagramConfigured, postToInstagram } from "@/lib/social/instagram";
import { isPinterestConfigured, postToPinterest } from "@/lib/social/pinterest";
import { isTelegramConfigured, postToTelegram } from "@/lib/social/telegram";
import {
  SOCIAL_PRODUCT_COLUMNS,
  type PublishResult,
  type SocialPlatform,
  type SocialPostInput,
  type SocialProduct,
  type SocialSlide,
} from "@/lib/social/types";

// The queue: products that turn active get a social_assets row. After a grace
// period (so a product published by mistake can be pulled back), each run
// picks the oldest ready product, writes its copy, generates its image and
// posts to every configured platform. Each step is saved as it completes, so
// a run that times out or fails picks up where it stopped next time.

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

const PUBLISHERS: Record<SocialPlatform, { configured: () => boolean; publish: (input: SocialPostInput) => Promise<PublishResult> }> = {
  telegram: { configured: isTelegramConfigured, publish: postToTelegram },
  instagram: { configured: isInstagramConfigured, publish: postToInstagram },
  pinterest: { configured: isPinterestConfigured, publish: postToPinterest },
};

export function isAutopostEnabled() {
  return process.env.SOCIAL_AUTOPOST_ENABLED === "true";
}

export function configuredPlatforms(): SocialPlatform[] {
  return (Object.keys(PUBLISHERS) as SocialPlatform[]).filter((platform) => PUBLISHERS[platform].configured());
}

function delayMinutes() {
  const value = Number(process.env.SOCIAL_AUTOPOST_DELAY_MINUTES);
  return Number.isFinite(value) && value >= 0 ? value : 30;
}

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials are not configured.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1000);
const isPublicActive = (product: SocialProduct) =>
  product.status.toLowerCase() === "active" && (product.visibility ?? "public") === "public";

type ClaimedAsset = {
  product_id: string;
  copy: unknown;
  image_url: string | null;
  slide_urls: string[] | null;
  attempts: number;
};

const MAX_REAL_PHOTOS = 2;

/**
 * The Instagram carousel, told as a story: the AI hero scene (the hook), an AI
 * close-up of the design (the meaning), then real product photos (what you
 * actually get). Only the hero is required; a failed close-up or photo just
 * makes the carousel shorter.
 */
async function buildSlides(supabase: SupabaseClient, product: SocialProduct, copy: SocialCopy, heroUrl: string | null) {
  // Printify mockup URLs name the camera (camera_label=back, person-2, …): a
  // blank back view tells nothing, and a worn/in-context shot tells more than a
  // folded one. The featured photo always comes first.
  const worn = (url: string) => (/camera_label=[^&]*(person|context|lifestyle)/i.test(url) ? 0 : 1);
  const gallery = (product.gallery_urls ?? [])
    .filter((url) => url && url !== product.featured_image_url && !/camera_label=[^&]*back/i.test(url))
    .sort((a, b) => worn(a) - worn(b));
  const photos = [product.featured_image_url, ...gallery]
    .filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index)
    .slice(0, MAX_REAL_PHOTOS);

  const [hero, detail, ...framed] = await Promise.allSettled([
    heroUrl ? Promise.resolve(heroUrl) : createSocialImage(supabase, product, copy.image_scene, "hero"),
    createSocialImage(supabase, product, copy.detail_scene, "detail"),
    ...photos.map((url, index) => frameProductPhoto(supabase, product, url, `photo${index + 1}`)),
  ]);
  if (hero.status === "rejected") throw hero.reason;

  for (const failed of [detail, ...framed].filter((result) => result.status === "rejected")) {
    console.warn(`Social slide skipped for ${product.slug}:`, (failed as PromiseRejectedResult).reason);
  }
  const slideUrls = [hero, detail, ...framed].flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  return { heroUrl: hero.value, slideUrls };
}

// Slide files are named by kind (see createSocialImage/frameProductPhoto),
// which is how each gets the right alt text back.
function slidesWithAlt(urls: string[], copy: SocialCopy): SocialSlide[] {
  return urls.map((url, index) => ({
    url,
    alt: index === 0 ? copy.alt_text : url.includes("-detail.") ? copy.detail_alt_text : copy.pinterest_title,
  }));
}

/** Add a queue row for every active product that has never been seen. */
async function enqueueNewProducts(supabase: SupabaseClient) {
  const [{ data: products, error }, { data: assets, error: assetsError }] = await Promise.all([
    supabase.from("products").select("id").in("status", ["active", "Active"]).eq("visibility", "public"),
    supabase.from("social_assets").select("product_id"),
  ]);
  if (error) throw new Error(error.message);
  if (assetsError) throw new Error(assetsError.message);

  const known = new Set((assets ?? []).map((row) => row.product_id as string));
  const rows = (products ?? []).filter((p) => !known.has(p.id)).map((p) => ({ product_id: p.id as string }));
  if (rows.length) {
    const { error: insertError } = await supabase
      .from("social_assets")
      .upsert(rows, { onConflict: "product_id", ignoreDuplicates: true });
    if (insertError) throw new Error(insertError.message);
  }
  return rows.length;
}

/**
 * Claim the oldest product that's past its grace period and not being worked
 * on, or the given product when an admin queued it by hand.
 */
async function claimNext(supabase: SupabaseClient, productId?: string) {
  const readyBefore = new Date(Date.now() - delayMinutes() * 60_000).toISOString();
  const staleLock = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();

  let query = supabase
    .from("social_assets")
    .select("product_id, copy, image_url, slide_urls, attempts")
    .in("status", ["queued", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .or(`locked_at.is.null,locked_at.lt.${staleLock}`);
  query = productId ? query.eq("product_id", productId) : query.lte("queued_at", readyBefore);

  const { data: candidates, error } = await query.order("queued_at", { ascending: true }).limit(5);
  if (error) throw new Error(error.message);

  for (const candidate of candidates ?? []) {
    // Conditional update is the lock: only one run can flip locked_at.
    const { data: claimed } = await supabase
      .from("social_assets")
      .update({ locked_at: new Date().toISOString() })
      .eq("product_id", candidate.product_id)
      .or(`locked_at.is.null,locked_at.lt.${staleLock}`)
      .select("product_id, copy, image_url, slide_urls, attempts");
    if (claimed?.length) return claimed[0] as ClaimedAsset;
  }
  return null;
}

async function updateAsset(supabase: SupabaseClient, productId: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from("social_assets")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("product_id", productId);
  if (error) throw new Error(error.message);
}

export type AutopostResult = {
  enabled: boolean;
  queued: number;
  product?: string;
  outcome?: "done" | "failed" | "skipped" | "waiting" | "blocked";
  platforms?: Partial<Record<SocialPlatform, "posted" | "failed" | "already posted">>;
  error?: string;
};

export async function runAutopost(
  supabase: SupabaseClient = getServiceClient(),
  options: { productId?: string } = {}
): Promise<AutopostResult> {
  if (!isAutopostEnabled()) return { enabled: false, queued: 0 };

  const platforms = configuredPlatforms();
  if (!platforms.length) return { enabled: true, queued: 0, error: "No social platform is configured." };

  const blackout = blackoutReason();
  if (blackout) return { enabled: true, queued: 0, error: blackout };

  const queued = await enqueueNewProducts(supabase);
  const asset = await claimNext(supabase, options.productId);
  if (!asset) return { enabled: true, queued };

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(SOCIAL_PRODUCT_COLUMNS)
    .eq("id", asset.product_id)
    .single<SocialProduct>();
  if (productError || !product) {
    await updateAsset(supabase, asset.product_id, { status: "skipped", error: "Product not found.", locked_at: null });
    return { enabled: true, queued, outcome: "skipped" };
  }

  const result: AutopostResult = { enabled: true, queued, product: product.slug, platforms: {} };

  if (!isPublicActive(product)) {
    await updateAsset(supabase, product.id, { status: "skipped", error: "Product is no longer active and public.", locked_at: null });
    return { ...result, outcome: "skipped" };
  }
  if (!product.featured_image_url) {
    // Printify mockups can land after activation; send it to the back of the queue.
    await updateAsset(supabase, product.id, {
      error: "Waiting for a featured image.",
      queued_at: new Date().toISOString(),
      locked_at: null,
    });
    return { ...result, outcome: "waiting" };
  }

  try {
    const parsedCopy = SocialCopySchema.safeParse(asset.copy);
    let copy: SocialCopy;
    if (parsedCopy.success) {
      copy = parsedCopy.data;
    } else {
      copy = await writeSocialCopy(product);
      await updateAsset(supabase, product.id, { copy });
    }

    let imageUrl = asset.image_url;
    let slideUrls = asset.slide_urls ?? [];
    if (!imageUrl || !slideUrls.length) {
      ({ heroUrl: imageUrl, slideUrls } = await buildSlides(supabase, product, copy, imageUrl));
      await updateAsset(supabase, product.id, { image_url: imageUrl, slide_urls: slideUrls });
    }
    const slides = slidesWithAlt(slideUrls, copy);

    const { data: existing } = await supabase
      .from("social_posts")
      .select("platform, status, attempts")
      .eq("product_id", product.id);
    const previous = new Map((existing ?? []).map((row) => [row.platform as SocialPlatform, row]));

    const failures: string[] = [];
    for (const platform of platforms) {
      const before = previous.get(platform);
      if (before?.status === "posted") {
        result.platforms![platform] = "already posted";
        continue;
      }
      const now = new Date().toISOString();
      const attempts = (before?.attempts ?? 0) + 1;
      try {
        const posted = await PUBLISHERS[platform].publish({ product, imageUrl, slides, copy });
        await supabase.from("social_posts").upsert(
          {
            product_id: product.id,
            platform,
            status: "posted",
            external_id: posted.externalId,
            external_url: posted.externalUrl,
            error: null,
            attempts,
            posted_at: now,
            updated_at: now,
          },
          { onConflict: "product_id,platform" }
        );
        result.platforms![platform] = "posted";
      } catch (error) {
        const message = errorMessage(error);
        console.error(`Social autopost ${platform} failed for ${product.slug}:`, message);
        failures.push(message);
        await supabase.from("social_posts").upsert(
          { product_id: product.id, platform, status: "failed", error: message, attempts, updated_at: now },
          { onConflict: "product_id,platform" }
        );
        result.platforms![platform] = "failed";
      }
    }

    if (failures.length) throw new Error(failures.join(" · "));

    await updateAsset(supabase, product.id, { status: "done", error: null, locked_at: null });
    return { ...result, outcome: "done" };
  } catch (error) {
    const message = errorMessage(error);
    if (error instanceof CharterBlockedError) {
      // Not a failure to retry: a person has to look at this product.
      await updateAsset(supabase, product.id, { status: "blocked", error: message, locked_at: null });
      return { ...result, outcome: "blocked", error: message };
    }
    console.error(`Social autopost failed for ${product.slug}:`, message);
    await updateAsset(supabase, product.id, {
      status: "failed",
      error: message,
      attempts: asset.attempts + 1,
      locked_at: null,
    });
    return { ...result, outcome: "failed", error: message };
  }
}
