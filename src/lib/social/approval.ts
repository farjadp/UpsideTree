import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRun } from "@/lib/agents/runs";
import {
  REJECT_REASONS,
  REVIEWABLE_STATUSES,
  decodeCallback,
  englishTail,
  formatSlideLines,
  mergeCaption,
  parseSlideReply,
  previewCaption,
  rejectKeyboard,
  reviewKeyboard,
  stageFor,
  type Decision,
  type RejectReason,
  type ReviewStage,
  type SlideLine,
} from "@/lib/social/approval-protocol";
import { lintAgainstCharter } from "@/lib/social/charter";
import type { SocialCopy } from "@/lib/social/copy";
import type { SocialProduct, SocialSlide } from "@/lib/social/types";

// The approval gate, in two stages. First the words: caption and slide lines
// go to the founder's private chat before any image is paid for. Then the
// finished carousel, before it posts. Buttons under each preview turn a tap
// into a decision, and every decision and edit is written to feedback_events
// (with the text before and after), which the copywriter reads next time.
//
// It runs on the content bot (TELEGRAM_BOT_TOKEN), the one that posts to the
// channel. Env: TELEGRAM_APPROVAL_CHAT_ID (the founder's private chat with
// that bot), TELEGRAM_WEBHOOK_SECRET (checked by /api/social/telegram).

const botToken = () => process.env.TELEGRAM_BOT_TOKEN;
const approvalChatId = () => process.env.TELEGRAM_APPROVAL_CHAT_ID?.trim() || null;

export function isApprovalConfigured() {
  return Boolean(botToken() && approvalChatId());
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(`Telegram ${method}: ${data?.description ?? `HTTP ${response.status}`}`);
  return data.result as T;
}

/** Where a preview went and what the bot is waiting for next. Stored in social_assets.review. */
export type ReviewState = {
  chat_id: string;
  message_id: number;
  media_message_ids: number[];
  stage?: ReviewStage;
  prompt_id?: number | null;
  awaiting?: "edit" | "reason" | "slides" | null;
  sent_at: string;
};

type CopyWithAngles = SocialCopy & {
  angles?: { line: string; format?: string }[];
  chosen?: number;
  runners_up?: number[];
};

function runnerUpLines(copy: CopyWithAngles): string[] {
  const angles = copy.angles ?? [];
  return (copy.runners_up ?? []).map((index) => angles[index]?.line).filter((line): line is string => Boolean(line));
}

function previewText(
  product: Pick<SocialProduct, "name_en" | "name_fa" | "slug">,
  copy: CopyWithAngles,
  renamedFrom: { name_en: string; slug: string } | null,
  stage: ReviewStage,
  editorNotes: string[] = []
) {
  const heading = stage === "copy" ? "📝 <b>مرحلهٔ ۱ از ۲: متن</b> (هنوز تصویری ساخته نشده)" : "🖼 <b>مرحلهٔ ۲ از ۲: پست نهایی</b>";
  const lines: string[] = [heading];
  if (editorNotes.length) {
    lines.push("", "⚠️ <b>ویراستار برند این متن را نگه داشت.</b> خودتان تصمیم بگیرید: اصلاح، تأیید یا رد.");
    editorNotes.slice(0, 5).forEach((issue) => lines.push(`• ${escapeHtml(previewCaption(issue, 300))}`));
  }
  lines.push("", `🧵 <b>${escapeHtml(product.name_en)}</b>`, escapeHtml(product.name_fa));
  if (renamedFrom) {
    lines.push("", `🏷 نام قبلی: <i>${escapeHtml(renamedFrom.name_en)}</i>`, `🔗 /products/${escapeHtml(product.slug)}`);
  }
  lines.push("", "<b>کپشن</b>", escapeHtml(previewCaption(copy.instagram_caption, 700)));
  if (copy.instagram_hashtags?.length) lines.push(escapeHtml(copy.instagram_hashtags.map((tag) => `#${tag}`).join(" ")));
  lines.push("", "<b>متن اسلایدها</b>", escapeHtml(formatSlideLines(copy.slide_texts)));
  if (stage === "copy") {
    lines.push("", "<b>صحنه‌ها</b>", `۱. ${escapeHtml(previewCaption(copy.image_scene, 160))}`, `۲. ${escapeHtml(previewCaption(copy.detail_scene, 160))}`);
  }
  const alternatives = runnerUpLines(copy);
  if (alternatives.length) {
    lines.push("", "<b>زاویه‌های دیگر</b>");
    alternatives.forEach((line, index) => lines.push(`${index + 1}. ${escapeHtml(line)}`));
  }
  // Telegram messages are capped at 4096 characters.
  return lines.join("\n").slice(0, 4000);
}

/**
 * Send a preview to the approval chat and remember where it went. The copy
 * stage sends text only; the visual stage sends the slides first. Throws when
 * Telegram refuses; the caller keeps the draft in review either way.
 */
export async function sendReviewRequest(
  supabase: SupabaseClient,
  input: {
    product: SocialProduct;
    copy: CopyWithAngles;
    slides: SocialSlide[];
    renamedFrom: { name_en: string; slug: string } | null;
    stage: ReviewStage;
    editorNotes?: string[];
  }
): Promise<ReviewState> {
  const chatId = approvalChatId();
  if (!chatId) throw new Error("TELEGRAM_APPROVAL_CHAT_ID is not set.");
  const { product, copy, slides, renamedFrom, stage, editorNotes = [] } = input;

  const started = performance.now();
  const media = stage === "visual" ? slides.slice(0, 10).map((slide) => ({ type: "photo", media: slide.url })) : [];
  const sent = media.length ? await tg<{ message_id: number }[]>("sendMediaGroup", { chat_id: chatId, media }) : [];
  const message = await tg<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: previewText(product, copy, renamedFrom, stage, editorNotes),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: reviewKeyboard(product.id, runnerUpLines(copy).length, stage) },
  });

  const review: ReviewState = {
    chat_id: chatId,
    message_id: message.message_id,
    media_message_ids: sent.map((m) => m.message_id),
    stage,
    awaiting: null,
    prompt_id: null,
    sent_at: new Date().toISOString(),
  };
  await supabase.from("social_assets").update({ review, updated_at: new Date().toISOString() }).eq("product_id", product.id);
  await recordRun(supabase, {
    agent: stage === "copy" ? "approval_request_copy" : "approval_request_visual",
    productId: product.id,
    status: "ok",
    durationMs: performance.now() - started,
    output: { slides: slides.length, renamed: Boolean(renamedFrom) },
  });
  return review;
}

/** Tell the founder something outside the button flow (held, published, failed). */
export async function notifyApprover(text: string, replyTo?: number | null) {
  const chatId = approvalChatId();
  if (!chatId || !botToken()) return;
  try {
    await tg("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
    });
  } catch (error) {
    console.warn("Approval notification failed:", error);
  }
}

async function removeButtons(review: ReviewState | null) {
  if (!review) return;
  await tg("editMessageReplyMarkup", { chat_id: review.chat_id, message_id: review.message_id, reply_markup: { inline_keyboard: [] } }).catch(
    () => undefined
  );
}

async function closeReview(review: ReviewState | null, outcome: string) {
  if (!review) return;
  await removeButtons(review);
  await tg("sendMessage", {
    chat_id: review.chat_id,
    text: outcome,
    parse_mode: "HTML",
    reply_parameters: { message_id: review.message_id, allow_sending_without_reply: true },
  }).catch((error) => console.warn("Closing the review message failed:", error));
}

type AssetRow = {
  product_id: string;
  status: string;
  copy: CopyWithAngles | null;
  review: ReviewState | null;
  products: Pick<SocialProduct, "name_en" | "name_fa" | "slug"> | null;
};

async function loadAsset(supabase: SupabaseClient, productId: string): Promise<AssetRow | null> {
  const { data } = await supabase
    .from("social_assets")
    .select("product_id, status, copy, review, products(slug, name_en, name_fa)")
    .eq("product_id", productId)
    .maybeSingle();
  return (data as unknown as AssetRow | null) ?? null;
}

type FeedbackValues = {
  decision: "approved" | "rejected" | "edited" | "alt_chosen" | "new_images";
  reason_code?: string | null;
  note?: string | null;
  target?: "caption" | "slides" | "images" | null;
  original_text?: string | null;
  edited_text?: string | null;
  source: "telegram" | "admin";
};

async function saveFeedback(supabase: SupabaseClient, asset: AssetRow, values: FeedbackValues) {
  const { error } = await supabase.from("feedback_events").insert({
    product_id: asset.product_id,
    decision: values.decision,
    reason_code: values.reason_code ?? null,
    note: values.note ?? null,
    target: values.target ?? null,
    original_text: values.original_text ?? null,
    edited_text: values.edited_text ?? null,
    stage: stageFor(asset.status),
    source: values.source,
    copy_snapshot: asset.copy,
  });
  if (error) console.warn("feedback_events insert failed:", error.message);
}

/** A warning, never a block: the founder's own words may use a listed term on purpose. */
function charterWarning(fields: Record<string, string | string[]>) {
  const violations = lintAgainstCharter(fields);
  if (!violations.length) return "";
  return `\n\n⚠️ بررسی Charter: ${violations.map((v) => `«${escapeHtml(v.term)}» (${escapeHtml(v.rule)})`).join("، ")}. اگر عمدی است، تأیید کنید.`;
}

export type DecisionOutcome = {
  /** Text for the person who decided (answerCallbackQuery / admin toast). */
  message: string;
  /** Publish this approved post now. */
  publish?: string;
  /** Redraft this product now (new angle). */
  requeue?: string;
  /** Generate images for this approved text now. */
  generate?: string;
  /** Re-draw slide text on the existing images and send a new preview. */
  rerender?: string;
};

type AnyDecision =
  | Decision
  | { kind: "reject_note"; note: string }
  | { kind: "edit_text"; text: string }
  | { kind: "slides_text"; text: string };

/**
 * Apply a founder decision to a draft. Shared by the Telegram webhook and the
 * admin page, so both leave the same trail. Stale decisions (a double tap, a
 * draft already handled) are refused, never re-applied.
 */
export async function applyDecision(
  supabase: SupabaseClient,
  productId: string,
  decision: AnyDecision,
  source: "telegram" | "admin"
): Promise<DecisionOutcome> {
  const asset = await loadAsset(supabase, productId);
  if (!asset) return { message: "این محصول در صف نیست." };
  if (!REVIEWABLE_STATUSES.has(asset.status)) return { message: `این پیش‌نویس قبلاً بسته شده (${asset.status}).` };
  const now = new Date().toISOString();
  const name = asset.products?.name_en ?? productId;
  const stage = stageFor(asset.status);
  const runnersUp = asset.copy ? runnerUpLines(asset.copy).length : 0;

  switch (decision.kind) {
    case "approve": {
      const next = stage === "copy" ? "copy_approved" : "approved";
      await supabase
        .from("social_assets")
        .update({ status: next, error: null, attempts: 0, reviewed_at: now, updated_at: now, review: { ...asset.review, awaiting: null, prompt_id: null } })
        .eq("product_id", productId);
      await saveFeedback(supabase, asset, { decision: "approved", source });
      if (stage === "copy") {
        await closeReview(asset.review, `✅ متن تأیید شد: <b>${escapeHtml(name)}</b>\nتصویرها در حال ساخت‌اند؛ چند دقیقهٔ دیگر پیش‌نمایش نهایی می‌رسد.`);
        return { message: "متن تأیید شد. تصویرها در حال ساخت.", generate: productId };
      }
      await closeReview(asset.review, `✅ تأیید شد: <b>${escapeHtml(name)}</b>\nدر حال انتشار…`);
      return { message: "تأیید شد. در حال انتشار.", publish: productId };
    }
    case "alt": {
      const line = asset.copy ? runnerUpLines(asset.copy)[decision.index] : undefined;
      if (!line) return { message: "این زاویه در دسترس نیست." };
      await supabase
        .from("social_assets")
        .update({
          status: "queued",
          forced_angle: line,
          copy: null,
          image_url: null,
          base_slide_urls: [],
          slide_urls: [],
          attempts: 0,
          error: null,
          queued_at: new Date(0).toISOString(),
          locked_at: null,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("product_id", productId);
      await saveFeedback(supabase, asset, { decision: "alt_chosen", note: line, source });
      await closeReview(asset.review, `🔁 زاویهٔ «${escapeHtml(line)}» انتخاب شد. متن تازه چند دقیقهٔ دیگر می‌رسد.`);
      return { message: "زاویهٔ جدید انتخاب شد.", requeue: productId };
    }
    case "new_images": {
      if (stage !== "visual") return { message: "هنوز تصویری ساخته نشده." };
      await supabase
        .from("social_assets")
        .update({ status: "copy_approved", image_url: null, base_slide_urls: [], slide_urls: [], attempts: 0, error: null, locked_at: null, updated_at: now })
        .eq("product_id", productId);
      await saveFeedback(supabase, asset, { decision: "new_images", target: "images", source });
      await closeReview(asset.review, "🖼 تصویرهای تازه در حال ساخت‌اند. متن همان می‌ماند.");
      return { message: "تصویر جدید در حال ساخت.", generate: productId };
    }
    case "reject_menu": {
      if (asset.review) {
        await tg("editMessageReplyMarkup", {
          chat_id: asset.review.chat_id,
          message_id: asset.review.message_id,
          reply_markup: { inline_keyboard: rejectKeyboard(productId) },
        });
      }
      return { message: "دلیل رد را انتخاب کنید." };
    }
    case "cancel": {
      if (asset.review) {
        await tg("editMessageReplyMarkup", {
          chat_id: asset.review.chat_id,
          message_id: asset.review.message_id,
          reply_markup: { inline_keyboard: reviewKeyboard(productId, runnersUp, stage) },
        });
      }
      return { message: "" };
    }
    case "reject": {
      if (decision.reason === "other" && source === "telegram" && !decision.note) {
        return askForReply(supabase, asset, "reason", "دلیل رد را در پاسخ به همین پیام بنویسید.");
      }
      return reject(supabase, asset, decision.reason, decision.note?.trim() || null, source, now);
    }
    case "reject_note":
      return reject(supabase, asset, "other", decision.note, source, now);
    case "edit": {
      if (!asset.copy) return { message: "این پیش‌نویس متنی ندارد." };
      const caption = asset.copy.instagram_caption;
      const persian = caption.slice(0, caption.length - englishTail(caption).length).trim();
      return askForReply(
        supabase,
        asset,
        "edit",
        `کپشن فعلی (فارسی):\n\n${persian}\n\nمتن جدید را در پاسخ به همین پیام بفرستید. اگر فقط فارسی بنویسید، بخش انگلیسی کپشن می‌ماند؛ اگر انگلیسی هم بنویسید، جایگزین می‌شود.`
      );
    }
    case "edit_slides": {
      if (!asset.copy) return { message: "این پیش‌نویس متنی ندارد." };
      return askForReply(
        supabase,
        asset,
        "slides",
        `متن فعلی اسلایدها:\n\n${formatSlideLines(asset.copy.slide_texts)}\n\nدر پاسخ به همین پیام، برای هر اسلاید یک خط بفرستید:\n• «فارسی | English» هر دو را عوض می‌کند\n• فقط فارسی: انگلیسی همان می‌ماند\n• «-»: آن اسلاید دست نمی‌خورد`
      );
    }
    case "edit_text": {
      if (!asset.copy) return { message: "این پیش‌نویس متنی ندارد." };
      const text = decision.text.trim();
      if (text.length < 20) return { message: "متن خیلی کوتاه است." };
      const copy: CopyWithAngles = {
        ...asset.copy,
        instagram_caption: mergeCaption(asset.copy.instagram_caption, text),
        telegram_caption: mergeCaption(asset.copy.telegram_caption, text),
      };
      await saveFeedback(supabase, asset, {
        decision: "edited",
        target: "caption",
        original_text: asset.copy.instagram_caption,
        edited_text: text,
        source,
      });
      const warning = charterWarning({ caption: copy.instagram_caption });
      await saveAndResend(supabase, asset, copy, stage, `✏️ کپشن به‌روز شد (بخش انگلیسی ${copy.instagram_caption === text ? "هم جایگزین شد" : "ماند"}).${warning}`);
      return { message: "کپشن ذخیره شد." };
    }
    case "slides_text": {
      if (!asset.copy) return { message: "این پیش‌نویس متنی ندارد." };
      const parsed = parseSlideReply(decision.text, asset.copy.slide_texts as SlideLine[]);
      if ("error" in parsed) {
        // The prompt stays open: the founder replies to the same message again.
        if (asset.review) {
          await tg("sendMessage", {
            chat_id: asset.review.chat_id,
            text: `${parsed.error}\nدوباره به همان پیام پاسخ بدهید.`,
            reply_parameters: { message_id: asset.review.prompt_id ?? asset.review.message_id, allow_sending_without_reply: true },
          }).catch(() => undefined);
        }
        return { message: parsed.error };
      }
      const copy: CopyWithAngles = { ...asset.copy, slide_texts: parsed.lines };
      await saveFeedback(supabase, asset, {
        decision: "edited",
        target: "slides",
        original_text: formatSlideLines(asset.copy.slide_texts),
        edited_text: formatSlideLines(parsed.lines),
        source,
      });
      const warning = charterWarning({ slide_texts: parsed.lines.flatMap((line) => [line.fa, line.en]) });
      if (stage === "visual") {
        // The images stay; only the text layer is drawn again (seconds, no AI cost).
        await supabase
          .from("social_assets")
          .update({ copy, error: null, updated_at: now, review: { ...asset.review, awaiting: null, prompt_id: null } })
          .eq("product_id", productId);
        await removeButtons(asset.review);
        if (asset.review) {
          await tg("sendMessage", {
            chat_id: asset.review.chat_id,
            text: `🖋 متن اسلایدها ذخیره شد؛ اسلایدها دوباره چیده می‌شوند…${warning}`,
            parse_mode: "HTML",
          }).catch(() => undefined);
        }
        return { message: "متن اسلایدها ذخیره شد.", rerender: productId };
      }
      await saveAndResend(supabase, asset, copy, stage, `🖋 متن اسلایدها به‌روز شد.${warning}`);
      return { message: "متن اسلایدها ذخیره شد." };
    }
  }
}

/** After an edit: save the copy, retire the old buttons and send the updated preview with fresh ones. */
async function saveAndResend(supabase: SupabaseClient, asset: AssetRow, copy: CopyWithAngles, stage: ReviewStage, note: string) {
  let review = asset.review ? { ...asset.review, awaiting: null, prompt_id: null } : null;
  if (asset.review && asset.products) {
    await removeButtons(asset.review);
    const message = await tg<{ message_id: number }>("sendMessage", {
      chat_id: asset.review.chat_id,
      text: `${note}\n\n${previewText(asset.products, copy, null, stage)}`.slice(0, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: reviewKeyboard(asset.product_id, runnerUpLines(copy).length, stage) },
    });
    review = { ...asset.review, message_id: message.message_id, awaiting: null, prompt_id: null };
  }
  await supabase
    .from("social_assets")
    .update({ copy, error: null, review, updated_at: new Date().toISOString() })
    .eq("product_id", asset.product_id);
}

async function askForReply(supabase: SupabaseClient, asset: AssetRow, awaiting: "edit" | "reason" | "slides", prompt: string): Promise<DecisionOutcome> {
  if (!asset.review) return { message: "این پیش‌نویس در تلگرام فرستاده نشده؛ از /admin/channels اقدام کنید." };
  const message = await tg<{ message_id: number }>("sendMessage", {
    chat_id: asset.review.chat_id,
    text: prompt.slice(0, 4000),
    reply_markup: { force_reply: true, selective: true },
  });
  await supabase
    .from("social_assets")
    .update({ review: { ...asset.review, awaiting, prompt_id: message.message_id }, updated_at: new Date().toISOString() })
    .eq("product_id", asset.product_id);
  return { message: "" };
}

async function reject(
  supabase: SupabaseClient,
  asset: AssetRow,
  reason: RejectReason,
  note: string | null,
  source: "telegram" | "admin",
  now: string
): Promise<DecisionOutcome> {
  const label = REJECT_REASONS[reason];
  await supabase
    .from("social_assets")
    .update({
      status: "rejected",
      error: `Rejected: ${label}${note ? ` — ${note}` : ""}`,
      reviewed_at: now,
      updated_at: now,
      locked_at: null,
      review: { ...asset.review, awaiting: null, prompt_id: null },
    })
    .eq("product_id", asset.product_id);
  await saveFeedback(supabase, asset, { decision: "rejected", reason_code: reason, note, source });
  await closeReview(asset.review, `❌ رد شد: ${escapeHtml(label)}${note ? `\n${escapeHtml(note)}` : ""}`);
  return { message: `رد شد: ${label}` };
}

/**
 * The founder's recent corrections, for the copywriter: rewrites (before and
 * after), rejections with reasons, and angles picked over the agent's choice.
 */
export async function recentFounderFeedback(supabase: SupabaseClient, limit = 20) {
  const { data } = await supabase
    .from("feedback_events")
    .select("decision, reason_code, note, target, original_text, edited_text, copy_snapshot, created_at")
    .in("decision", ["edited", "rejected", "alt_chosen", "new_images"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => {
    const snapshot = row.copy_snapshot as CopyWithAngles | null;
    const hook = snapshot?.instagram_caption?.split("\n")[0] ?? null;
    switch (row.decision) {
      case "edited":
        return {
          kind: row.target === "slides" ? "rewrote slide lines" : "rewrote caption",
          before: row.original_text?.slice(0, 900) ?? null,
          after: row.edited_text,
        };
      case "rejected":
        return {
          kind: "rejected the post",
          reason: row.reason_code ? (REJECT_REASONS[row.reason_code as RejectReason] ?? row.reason_code) : null,
          note: row.note,
          rejected_hook: hook,
        };
      case "alt_chosen":
        return {
          kind: "picked a runner-up angle over yours",
          preferred: row.note,
          over: snapshot?.angles?.[snapshot.chosen ?? -1]?.line ?? hook,
        };
      default:
        return { kind: "asked for new images", scenes: snapshot ? [snapshot.image_scene, snapshot.detail_scene] : null };
    }
  });
}

// ---------------------------------------------------------------------------
// Telegram update handling

type TelegramUpdate = {
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
  message?: {
    message_id: number;
    from?: { id: number };
    chat: { id: number };
    text?: string;
    reply_to_message?: { message_id: number };
  };
};

function fromApprover(id: number | undefined) {
  const chat = approvalChatId();
  return Boolean(chat && id !== undefined && String(id) === chat);
}

/**
 * Route one Telegram update. Only the approval chat is listened to; anyone
 * else gets their chat id back while no approval chat is set, and nothing more.
 */
export async function handleTelegramUpdate(supabase: SupabaseClient, update: TelegramUpdate): Promise<DecisionOutcome | null> {
  if (update.callback_query) {
    const query = update.callback_query;
    const answer = (text: string) => tg("answerCallbackQuery", { callback_query_id: query.id, ...(text ? { text } : {}) }).catch(() => undefined);
    if (!fromApprover(query.from.id)) {
      await answer("این دکمه برای شما نیست.");
      return null;
    }
    const decoded = decodeCallback(query.data);
    if (!decoded) {
      await answer("دکمهٔ ناشناخته.");
      return null;
    }
    const outcome = await applyDecision(supabase, decoded.productId, decoded.decision, "telegram");
    await answer(outcome.message);
    return outcome;
  }

  const message = update.message;
  if (!message?.text) return null;
  if (!fromApprover(message.chat.id)) {
    if (!approvalChatId() && /^\/start/.test(message.text)) {
      await tg("sendMessage", { chat_id: message.chat.id, text: `Chat id: ${message.chat.id}` }).catch(() => undefined);
    }
    return null;
  }
  // Normally the founder answers the bot's prompt with Telegram's Reply. A
  // plain message counts too when exactly one prompt is open; otherwise the
  // bot says how to edit instead of ignoring the text.
  const replyTo = message.reply_to_message?.message_id;
  type OpenPrompt = { product_id: string; review: ReviewState | null };
  let asset: OpenPrompt | null = null;
  if (replyTo) {
    const { data } = await supabase.from("social_assets").select("product_id, review").eq("review->>prompt_id", String(replyTo)).maybeSingle();
    asset = (data as OpenPrompt | null) ?? null;
  }
  if (!asset?.review?.awaiting) {
    const { data: open } = await supabase
      .from("social_assets")
      .select("product_id, review")
      .not("review->>awaiting", "is", null)
      .order("updated_at", { ascending: false })
      .limit(2);
    const prompts = (open ?? []) as OpenPrompt[];
    if (prompts.length === 1) {
      asset = prompts[0];
    } else {
      await tg("sendMessage", {
        chat_id: message.chat.id,
        text:
          prompts.length > 1
            ? "چند پیش‌نویس منتظر متن شماست؛ روی پیام مربوط Reply بزنید و متن را بفرستید."
            : "برای اصلاح، اول زیر پیش‌نمایش «✏️ کپشن» یا «🖋 متن اسلایدها» را بزنید، بعد متن را بفرستید.",
      }).catch(() => undefined);
      return null;
    }
  }
  const awaiting = asset?.review?.awaiting;
  if (!asset || !awaiting) return null;

  const decision: AnyDecision =
    awaiting === "edit"
      ? { kind: "edit_text", text: message.text }
      : awaiting === "slides"
        ? { kind: "slides_text", text: message.text }
        : { kind: "reject_note", note: message.text };
  return applyDecision(supabase, asset.product_id, decision, "telegram");
}
