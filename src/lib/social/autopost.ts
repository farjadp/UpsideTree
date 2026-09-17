import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { step } from "@/lib/agents/runs";
import { ANTHROPIC_COPY_MODEL } from "@/lib/ai/anthropic-copy";
import { isApprovalConfigured, notifyApprover, sendReviewRequest, type ReviewState } from "@/lib/social/approval";
import { BrandCopyError, applyBrandCopy, draftBrandCopy, type BrandCopyUpdate } from "@/lib/social/brand-copy";
import { blackoutReason } from "@/lib/social/charter";
import { CharterBlockedError, SocialCopySchema, writeSocialCopy, type SocialCopy } from "@/lib/social/copy";
import { runCopywriter } from "@/lib/social/copywriter";
import { createSocialImage, frameProductPhoto, uploadSocialImage } from "@/lib/social/image";
import { renderSlideText } from "@/lib/social/slide-text";
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

// The orchestrator of the social-post workflow (Agentic spec §6.1). Products
// that turn active get a social_assets row. After a grace period (so a
// product published by mistake can be pulled back), each run picks the
// oldest ready product and takes it one stage further:
//
//   words     queued/failed → brand copy draft → copywriter → brand editor →
//             text preview to the founder → 'copy_review'
//   images    copy_approved → images → slides → carousel preview → 'review'
//   publish   approved → apply the brand rewrite → post everywhere → 'done'
//
// The founder approves twice: the words before any image is paid for, and
// the carousel before it posts. One stage per run also keeps each run inside
// the function time limit. Each step is saved as it
// completes and logged to agent_runs, so a run that times out or fails picks
// up where it stopped next time.

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
const isHeldForHuman = (error: unknown) => error instanceof CharterBlockedError || error instanceof BrandCopyError;

const ASSET_COLUMNS = "product_id, status, copy, image_url, base_slide_urls, slide_urls, attempts, pending_product, forced_angle, review";

type ClaimedAsset = {
  product_id: string;
  status: string;
  copy: unknown;
  image_url: string | null;
  base_slide_urls: string[] | null;
  slide_urls: string[] | null;
  attempts: number;
  pending_product: BrandCopyUpdate | null;
  forced_angle: string | null;
  review: ReviewState | null;
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
  // blank back view or a size chart tells nothing, and a worn/in-context shot tells more than a
  // folded one. The featured photo always comes first.
  const worn = (url: string) => (/camera_label=[^&]*(person|context|lifestyle)/i.test(url) ? 0 : 1);
  const gallery = (product.gallery_urls ?? [])
    .filter((url) => url && url !== product.featured_image_url && !/camera_label=[^&]*(back|size-chart)/i.test(url))
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
    alt: index === 0 ? copy.alt_text : url.includes("-detail") ? copy.detail_alt_text : copy.pinterest_title,
  }));
}

/**
 * Print the story lines onto the carousel. Each slide gets its beat in order;
 * if some slides failed to generate, the last line still lands on the last
 * slide so the story always ends. A slide that fails to render goes out
 * without text rather than holding the post.
 */
async function renderStorySlides(supabase: SupabaseClient, product: SocialProduct, baseUrls: string[], copy: SocialCopy) {
  const texts = copy.slide_texts;
  return Promise.all(
    baseUrls.map(async (url, index) => {
      const isLast = index === baseUrls.length - 1;
      const text = isLast ? texts[texts.length - 1] : texts[index];
      if (!text) return url;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error(`download ${response.status}`);
        const kind = url.match(/-(hero|detail|photo\d+)\.jpg$/)?.[1] ?? `slide${index + 1}`;
        const rendered = await renderSlideText(Buffer.from(await response.arrayBuffer()), text, {
          footer: isLast ? "LINK IN BIO  ·  UPSIDETREE.CA" : undefined,
          // Supplier mockups sit on white studio backdrops; a solid band reads better there.
          band: kind.startsWith("photo") ? true : undefined,
        });
        return await uploadSocialImage(supabase, product, `${kind}-story`, rendered);
      } catch (error) {
        console.warn(`Slide text skipped for ${product.slug} slide ${index + 1}:`, error);
        return url;
      }
    })
  );
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
 * Claim the oldest product that needs work and isn't being worked on: a
 * queued or failed draft past its grace period, or an approved post waiting
 * to publish. Or the given product when an admin or approval asked for it.
 */
async function claimNext(supabase: SupabaseClient, productId?: string) {
  const readyBefore = new Date(Date.now() - delayMinutes() * 60_000).toISOString();
  const staleLock = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();

  let query = supabase
    .from("social_assets")
    .select(ASSET_COLUMNS)
    .in("status", ["queued", "failed", "copy_approved", "approved"])
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
      .select(ASSET_COLUMNS);
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
  outcome?: "done" | "copy_review" | "review" | "failed" | "skipped" | "waiting" | "blocked";
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

  const { data: loaded, error: productError } = await supabase
    .from("products")
    .select(SOCIAL_PRODUCT_COLUMNS)
    .eq("id", asset.product_id)
    .single<SocialProduct>();
  if (productError || !loaded) {
    await updateAsset(supabase, asset.product_id, { status: "skipped", error: "Product not found.", locked_at: null });
    return { enabled: true, queued, outcome: "skipped" };
  }
  const product: SocialProduct = loaded;
  const result: AutopostResult = { enabled: true, queued, product: product.slug, platforms: {} };

  if (!isPublicActive(product)) {
    await updateAsset(supabase, product.id, { status: "skipped", error: "Product is no longer active and public.", locked_at: null });
    return { ...result, outcome: "skipped" };
  }

  if (asset.status === "approved") return publishApproved(supabase, asset, product, platforms, result);
  if (asset.status === "copy_approved") return buildVisuals(supabase, asset, product, result);
  return draftCopy(supabase, asset, product, result);
}

/** Stage 1: the words. Ends in 'copy_review', 'blocked' or 'failed'. No image is generated here. */
async function draftCopy(supabase: SupabaseClient, asset: ClaimedAsset, loaded: SocialProduct, result: AutopostResult): Promise<AutopostResult> {
  if (!loaded.featured_image_url) {
    // Printify mockups can land after activation; send it to the back of the queue.
    await updateAsset(supabase, loaded.id, { error: "Waiting for a featured image.", queued_at: new Date().toISOString(), locked_at: null });
    return { ...result, outcome: "waiting" };
  }
  const log = { productId: loaded.id };

  try {
    // Supplier-default titles and size charts never go out. The rewrite is
    // drafted now so the copywriter works from the brand name, but it only
    // reaches the product page when the founder approves the post (spec §5).
    const { product, pending, renamedFrom } = await withBrandCopy(supabase, asset, loaded);

    const parsedCopy = SocialCopySchema.safeParse(asset.copy);
    let copy: SocialCopy;
    let editorNotes: string[] = [];
    if (parsedCopy.success && !asset.forced_angle) {
      copy = parsedCopy.data;
    } else {
      // The copywriter agent drafts (founder feedback, ten angles, library,
      // recent posts); the brand editor in writeSocialCopy reviews. If the
      // agent fails, the plain writer takes over so a post is never lost.
      const draft = process.env.ANTHROPIC_API_KEY
        ? await step(
            supabase,
            { ...log, agent: "copywriter", model: ANTHROPIC_COPY_MODEL, summarize: (d) => d && { chosen: d.angles[d.chosen]?.line, angles: d.angles.length, verse: d.verse?.source ?? null } },
            () => runCopywriter(product, { supabase, forcedAngle: asset.forced_angle })
          ).catch((error) => {
            console.warn(`Copywriter agent failed for ${product.slug}, using the plain writer:`, error);
            return null;
          })
        : null;
      copy = await step(supabase, { ...log, agent: "brand_editor", isBlocked: isHeldForHuman, summarize: (c) => ({ angle: c.story_angle }) }, () =>
        writeSocialCopy(product, draft?.copy)
      ).catch((error) => {
        // A draft the editor holds still goes to the founder, with the notes: they decide, fix or reject.
        if (error instanceof CharterBlockedError && error.draft) {
          editorNotes = error.issues.length ? error.issues : [error.message];
          return error.draft;
        }
        throw error;
      });
      // Keep the agent's other angles next to the copy so the founder can swap them in.
      await updateAsset(supabase, product.id, {
        copy: draft ? { ...copy, angles: draft.angles, chosen: draft.chosen, runners_up: draft.runners_up, verse: draft.verse } : copy,
        forced_angle: null,
      });
    }

    const { data: stored } = await supabase.from("social_assets").select("copy").eq("product_id", product.id).single();
    const note = await requestReview(supabase, { product, copy: (stored?.copy as SocialCopy) ?? copy, slides: [], renamedFrom, stage: "copy", editorNotes });
    const flagged = editorNotes.length ? `Brand editor flagged: ${editorNotes.join(" · ")}`.slice(0, 1000) : null;
    await updateAsset(supabase, product.id, { status: "copy_review", error: [flagged, note].filter(Boolean).join(" | ") || null, locked_at: null, pending_product: pending });
    return { ...result, outcome: "copy_review", ...(note ? { error: note } : {}) };
  } catch (error) {
    return holdOrFail(supabase, asset, loaded, error, result, "failed");
  }
}

/** Stage 2: images and slides for approved words. Ends in 'review', or back in 'copy_approved' for a retry. */
async function buildVisuals(supabase: SupabaseClient, asset: ClaimedAsset, loaded: SocialProduct, result: AutopostResult): Promise<AutopostResult> {
  const log = { productId: loaded.id };
  try {
    const parsed = SocialCopySchema.safeParse(asset.copy);
    if (!parsed.success) throw new Error("Approved text is missing or unreadable.");
    const copy = parsed.data;
    const product = asset.pending_product ? { ...loaded, ...asset.pending_product } : loaded;
    const renamedFrom = asset.pending_product ? { name_en: loaded.name_en, slug: loaded.slug } : null;

    let imageUrl = asset.image_url;
    let baseSlideUrls = asset.base_slide_urls ?? [];
    if (!imageUrl || !baseSlideUrls.length) {
      ({ heroUrl: imageUrl, slideUrls: baseSlideUrls } = await step(
        supabase,
        { ...log, agent: "creative_images", model: "gpt-image-2", summarize: (s) => ({ slides: s.slideUrls.length }) },
        () => buildSlides(supabase, product, copy, imageUrl)
      ));
      await updateAsset(supabase, product.id, { image_url: imageUrl, base_slide_urls: baseSlideUrls, slide_urls: [] });
    }
    const slideUrls = await step(supabase, { ...log, agent: "creative_slides", summarize: (s) => ({ slides: s.length }) }, () =>
      renderStorySlides(supabase, product, baseSlideUrls, copy)
    );
    await updateAsset(supabase, product.id, { slide_urls: slideUrls });

    const note = await requestReview(supabase, { product, copy: asset.copy as SocialCopy, slides: slidesWithAlt(slideUrls, copy), renamedFrom, stage: "visual" });
    await updateAsset(supabase, product.id, { status: "review", error: note, attempts: 0, locked_at: null });
    return { ...result, outcome: "review", ...(note ? { error: note } : {}) };
  } catch (error) {
    // The words are already approved; a failed image run retries from here, never re-asks for text approval.
    return holdOrFail(supabase, asset, loaded, error, result, "copy_approved");
  }
}

/**
 * The founder changed the slide lines on a finished carousel: draw the text
 * again on the same images (no AI cost) and send a fresh preview.
 */
export async function rerenderStory(supabase: SupabaseClient, productId: string) {
  const [{ data: asset }, { data: loaded }] = await Promise.all([
    supabase.from("social_assets").select(ASSET_COLUMNS).eq("product_id", productId).single<ClaimedAsset>(),
    supabase.from("products").select(SOCIAL_PRODUCT_COLUMNS).eq("id", productId).single<SocialProduct>(),
  ]);
  if (!asset || !loaded) throw new Error("Draft not found.");
  const parsed = SocialCopySchema.safeParse(asset.copy);
  if (!parsed.success || !asset.base_slide_urls?.length) throw new Error("Draft has no text or images to re-render.");
  const product = asset.pending_product ? { ...loaded, ...asset.pending_product } : loaded;

  const slideUrls = await step(supabase, { productId, agent: "creative_slides_rerender", summarize: (s) => ({ slides: s.length }) }, () =>
    renderStorySlides(supabase, product, asset.base_slide_urls!, parsed.data)
  );
  await updateAsset(supabase, productId, { slide_urls: slideUrls });
  const renamedFrom = asset.pending_product ? { name_en: loaded.name_en, slug: loaded.slug } : null;
  const note = await requestReview(supabase, { product, copy: asset.copy as SocialCopy, slides: slidesWithAlt(slideUrls, parsed.data), renamedFrom, stage: "visual" });
  if (note) await updateAsset(supabase, productId, { error: note });
}

async function withBrandCopy(supabase: SupabaseClient, asset: ClaimedAsset, loaded: SocialProduct) {
  if (asset.pending_product) {
    return { product: { ...loaded, ...asset.pending_product }, pending: asset.pending_product, renamedFrom: { name_en: loaded.name_en, slug: loaded.slug } };
  }
  const draft = await step(
    supabase,
    { productId: loaded.id, agent: "brand_copy", isBlocked: isHeldForHuman, summarize: (d) => d && { name_en: d.update.name_en, slug: d.update.slug } },
    () => draftBrandCopy(supabase, loaded)
  );
  if (!draft) return { product: loaded, pending: null, renamedFrom: null };
  return { product: draft.product, pending: draft.update, renamedFrom: { name_en: loaded.name_en, slug: loaded.slug } };
}

/** Send a preview; returns a note for the admin page when it couldn't go to Telegram. */
async function requestReview(supabase: SupabaseClient, input: Parameters<typeof sendReviewRequest>[1]) {
  if (!isApprovalConfigured()) return "Approval chat not configured; approve in /admin/channels.";
  try {
    await sendReviewRequest(supabase, input);
    return null;
  } catch (error) {
    return `Preview not sent to Telegram: ${errorMessage(error)}. Approve in /admin/channels.`;
  }
}

async function holdOrFail(
  supabase: SupabaseClient,
  asset: ClaimedAsset,
  loaded: SocialProduct,
  error: unknown,
  result: AutopostResult,
  retryStatus: "failed" | "copy_approved"
): Promise<AutopostResult> {
  const message = errorMessage(error);
  if (isHeldForHuman(error)) {
    // Not a failure to retry: a person has to look at this product.
    await updateAsset(supabase, loaded.id, { status: "blocked", error: message, locked_at: null });
    await notifyApprover(`⛔️ نگه داشته شد: <b>${loaded.name_en}</b>\n${message}\n\nدر /admin/channels بررسی کنید.`);
    return { ...result, outcome: "blocked", error: message };
  }
  const attempts = asset.attempts + 1;
  console.error(`Social ${retryStatus === "failed" ? "draft" : "images"} failed for ${loaded.slug}:`, message);
  await updateAsset(supabase, loaded.id, { status: retryStatus, error: message, attempts, locked_at: null });
  if (attempts >= MAX_ATTEMPTS) {
    await notifyApprover(`⚠️ بعد از ${MAX_ATTEMPTS} تلاش ناموفق ماند: <b>${loaded.name_en}</b>\n${message}\n\nاز /admin/channels دوباره بفرستید.`);
  }
  return { ...result, outcome: "failed", error: message };
}

/** Phase 2: an approved draft goes out. Ends in 'done', or stays 'approved' with the error for a retry. */
async function publishApproved(
  supabase: SupabaseClient,
  asset: ClaimedAsset,
  loaded: SocialProduct,
  platforms: SocialPlatform[],
  result: AutopostResult
): Promise<AutopostResult> {
  const log = { productId: loaded.id };
  try {
    const parsed = SocialCopySchema.safeParse(asset.copy);
    if (!parsed.success) throw new Error("Approved draft has no usable copy.");
    const copy = parsed.data;
    if (!asset.image_url || !asset.slide_urls?.length) throw new Error("Approved draft has no images.");

    let product = loaded;
    if (asset.pending_product) {
      product = await step(supabase, { ...log, agent: "brand_copy_apply", summarize: (p) => ({ slug: p.slug }) }, () =>
        applyBrandCopy(supabase, loaded.id, asset.pending_product!)
      );
      await updateAsset(supabase, product.id, { pending_product: null });
    }
    const slides = slidesWithAlt(asset.slide_urls, copy);

    const { data: existing } = await supabase.from("social_posts").select("platform, status, attempts").eq("product_id", product.id);
    const previous = new Map((existing ?? []).map((row) => [row.platform as SocialPlatform, row]));

    const failures: string[] = [];
    const links: string[] = [];
    for (const platform of platforms) {
      const before = previous.get(platform);
      if (before?.status === "posted") {
        result.platforms![platform] = "already posted";
        continue;
      }
      const now = new Date().toISOString();
      const attempts = (before?.attempts ?? 0) + 1;
      try {
        const posted = await step(supabase, { ...log, agent: `publish_${platform}`, summarize: (p) => ({ url: p.externalUrl }) }, () =>
          PUBLISHERS[platform].publish({ product, imageUrl: asset.image_url!, slides, copy })
        );
        await supabase.from("social_posts").upsert(
          { product_id: product.id, platform, status: "posted", external_id: posted.externalId, external_url: posted.externalUrl, error: null, attempts, posted_at: now, updated_at: now },
          { onConflict: "product_id,platform" }
        );
        result.platforms![platform] = "posted";
        if (posted.externalUrl) links.push(posted.externalUrl);
      } catch (error) {
        const message = errorMessage(error);
        console.error(`Social publish ${platform} failed for ${product.slug}:`, message);
        failures.push(`${platform}: ${message}`);
        await supabase.from("social_posts").upsert(
          { product_id: product.id, platform, status: "failed", error: message, attempts, updated_at: now },
          { onConflict: "product_id,platform" }
        );
        result.platforms![platform] = "failed";
      }
    }
    if (failures.length) throw new Error(failures.join(" · "));

    await updateAsset(supabase, product.id, { status: "done", error: null, locked_at: null });
    await notifyApprover(`📣 منتشر شد: <b>${product.name_en}</b>\n${links.join("\n")}`, asset.review?.message_id);
    return { ...result, outcome: "done" };
  } catch (error) {
    const message = errorMessage(error);
    const attempts = asset.attempts + 1;
    await updateAsset(supabase, loaded.id, { status: "approved", error: message, attempts, locked_at: null });
    await notifyApprover(
      `⚠️ انتشار ناموفق (${attempts}/${MAX_ATTEMPTS}): <b>${loaded.name_en}</b>\n${message}${attempts < MAX_ATTEMPTS ? "\nدوباره تلاش می‌شود." : "\nاز /admin/channels دوباره بفرستید."}`,
      asset.review?.message_id
    );
    return { ...result, outcome: "failed", error: message };
  }
}
