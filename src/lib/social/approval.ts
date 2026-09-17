import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRun } from "@/lib/agents/runs";
import {
  REJECT_REASONS,
  REVIEWABLE_STATUSES,
  decodeCallback,
  previewCaption,
  rejectKeyboard,
  reviewKeyboard,
  type Decision,
  type RejectReason,
} from "@/lib/social/approval-protocol";
import type { SocialCopy } from "@/lib/social/copy";
import type { SocialProduct, SocialSlide } from "@/lib/social/types";

// The approval gate. A finished draft is sent to the founder's private chat
// with the approval bot: the slides, the captions, the product rename if
// there is one, and the copywriter's runner-up angles. Buttons under it turn
// a tap into a decision; each decision is written to feedback_events with
// its reason, which is what the learning loop will read.
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
  prompt_id?: number | null;
  awaiting?: "edit" | "reason" | null;
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

function previewText(product: SocialProduct, copy: CopyWithAngles, renamedFrom: { name_en: string; slug: string } | null) {
  const lines: string[] = [`🧵 <b>${escapeHtml(product.name_en)}</b>`, escapeHtml(product.name_fa)];
  if (renamedFrom) {
    lines.push("", `🏷 نام قبلی: <i>${escapeHtml(renamedFrom.name_en)}</i>`, `🔗 /products/${escapeHtml(product.slug)}`);
  }
  lines.push("", escapeHtml(previewCaption(copy.instagram_caption)));
  if (copy.instagram_hashtags?.length) lines.push("", escapeHtml(copy.instagram_hashtags.map((tag) => `#${tag}`).join(" ")));
  const alternatives = runnerUpLines(copy);
  if (alternatives.length) {
    lines.push("", "🔁 زاویه‌های دیگر:");
    alternatives.forEach((line, index) => lines.push(`${index + 1}. ${escapeHtml(line)}`));
  }
  return lines.join("\n");
}

/**
 * Send the preview to the approval chat and remember where it went. Throws
 * when Telegram refuses; the caller keeps the draft in review either way.
 */
export async function sendReviewRequest(
  supabase: SupabaseClient,
  input: {
    product: SocialProduct;
    copy: CopyWithAngles;
    slides: SocialSlide[];
    renamedFrom: { name_en: string; slug: string } | null;
  }
): Promise<ReviewState> {
  const chatId = approvalChatId();
  if (!chatId) throw new Error("TELEGRAM_APPROVAL_CHAT_ID is not set.");
  const { product, copy, slides, renamedFrom } = input;

  const started = performance.now();
  const media = slides.slice(0, 10).map((slide, index) => ({
    type: "photo",
    media: slide.url,
    ...(index === 0 ? { caption: previewCaption(copy.telegram_caption, 1000) } : {}),
  }));
  const sent = media.length ? await tg<{ message_id: number }[]>("sendMediaGroup", { chat_id: chatId, media }) : [];
  const message = await tg<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: previewText(product, copy, renamedFrom),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: reviewKeyboard(product.id, runnerUpLines(copy).length) },
  });

  const review: ReviewState = {
    chat_id: chatId,
    message_id: message.message_id,
    media_message_ids: sent.map((m) => m.message_id),
    awaiting: null,
    sent_at: new Date().toISOString(),
  };
  await supabase
    .from("social_assets")
    .update({ review, updated_at: new Date().toISOString() })
    .eq("product_id", product.id);
  await recordRun(supabase, {
    agent: "approval_request",
    productId: product.id,
    status: "ok",
    durationMs: performance.now() - started,
    output: { slides: slides.length, renamed: Boolean(renamedFrom) },
  });
  return review;
}

/** Tell the founder something about a draft outside the button flow (held, published, failed). */
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

async function closeReview(review: ReviewState | null, outcome: string) {
  if (!review) return;
  try {
    await tg("editMessageReplyMarkup", { chat_id: review.chat_id, message_id: review.message_id, reply_markup: { inline_keyboard: [] } });
    await tg("sendMessage", {
      chat_id: review.chat_id,
      text: outcome,
      parse_mode: "HTML",
      reply_parameters: { message_id: review.message_id, allow_sending_without_reply: true },
    });
  } catch (error) {
    console.warn("Closing the review message failed:", error);
  }
}

type AssetRow = {
  product_id: string;
  status: string;
  copy: CopyWithAngles | null;
  review: ReviewState | null;
  products: { name_en: string } | null;
};

async function loadAsset(supabase: SupabaseClient, productId: string): Promise<AssetRow | null> {
  const { data } = await supabase
    .from("social_assets")
    .select("product_id, status, copy, review, products(name_en)")
    .eq("product_id", productId)
    .maybeSingle();
  return (data as unknown as AssetRow | null) ?? null;
}

async function saveFeedback(
  supabase: SupabaseClient,
  asset: AssetRow,
  values: { decision: "approved" | "rejected" | "edited" | "alt_chosen"; reason_code?: string | null; note?: string | null; edited_text?: string | null; source: "telegram" | "admin" }
) {
  const { error } = await supabase.from("feedback_events").insert({
    product_id: asset.product_id,
    decision: values.decision,
    reason_code: values.reason_code ?? null,
    note: values.note ?? null,
    edited_text: values.edited_text ?? null,
    source: values.source,
    copy_snapshot: asset.copy,
  });
  if (error) console.warn("feedback_events insert failed:", error.message);
}

export type DecisionOutcome = {
  /** Text for the person who decided (answerCallbackQuery / admin toast). */
  message: string;
  /** The product should be published now. */
  publish?: string;
  /** The product should be regenerated now. */
  requeue?: string;
};

/**
 * Apply a founder decision to a draft. Shared by the Telegram webhook and the
 * admin page, so both leave the same trail. Stale decisions (a double tap, a
 * draft already handled) are refused, never re-applied.
 */
export async function applyDecision(
  supabase: SupabaseClient,
  productId: string,
  decision: Decision | { kind: "reject_note"; note: string } | { kind: "edit_text"; text: string },
  source: "telegram" | "admin"
): Promise<DecisionOutcome> {
  const asset = await loadAsset(supabase, productId);
  if (!asset) return { message: "این محصول در صف نیست." };
  if (!REVIEWABLE_STATUSES.has(asset.status)) return { message: `این پیش‌نویس قبلاً بسته شده (${asset.status}).` };
  const now = new Date().toISOString();
  const name = asset.products?.name_en ?? productId;

  switch (decision.kind) {
    case "approve": {
      await supabase
        .from("social_assets")
        .update({ status: "approved", error: null, attempts: 0, reviewed_at: now, updated_at: now, review: { ...asset.review, awaiting: null } })
        .eq("product_id", productId);
      await saveFeedback(supabase, asset, { decision: "approved", source });
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
      await closeReview(asset.review, `🔁 زاویهٔ «${escapeHtml(line)}» انتخاب شد. پیش‌نویس تازه چند دقیقهٔ دیگر می‌رسد.`);
      return { message: "زاویهٔ جدید انتخاب شد.", requeue: productId };
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
          reply_markup: { inline_keyboard: reviewKeyboard(productId, asset.copy ? runnerUpLines(asset.copy).length : 0) },
        });
      }
      return { message: "" };
    }
    case "reject": {
      if (decision.reason === "other" && source === "telegram") {
        return askForReply(supabase, asset, "reason", "دلیل رد را در پاسخ به همین پیام بنویسید.");
      }
      return reject(supabase, asset, decision.reason, decision.note?.trim() || null, source, now);
    }
    case "reject_note":
      return reject(supabase, asset, "other", decision.note, source, now);
    case "edit": {
      return askForReply(supabase, asset, "edit", "متن جدید کپشن را در پاسخ به همین پیام بفرستید. اسلایدها تغییر نمی‌کنند.");
    }
    case "edit_text": {
      if (!asset.copy) return { message: "این پیش‌نویس متنی ندارد." };
      const text = decision.text.trim();
      if (text.length < 20) return { message: "متن خیلی کوتاه است." };
      const copy: CopyWithAngles = { ...asset.copy, instagram_caption: text, telegram_caption: text };
      await supabase
        .from("social_assets")
        .update({ copy, status: "review", error: null, updated_at: now, review: { ...asset.review, awaiting: null, prompt_id: null } })
        .eq("product_id", productId);
      await saveFeedback(supabase, asset, { decision: "edited", edited_text: text, source });
      if (asset.review) {
        const message = await tg<{ message_id: number }>("sendMessage", {
          chat_id: asset.review.chat_id,
          text: `✏️ متن به‌روز شد:\n\n${escapeHtml(previewCaption(text))}\n\nحالا تأیید کنید یا رد.`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: reviewKeyboard(productId, runnerUpLines(copy).length) },
        });
        await supabase
          .from("social_assets")
          .update({ review: { ...asset.review, message_id: message.message_id, awaiting: null, prompt_id: null } })
          .eq("product_id", productId);
      }
      return { message: "متن ذخیره شد." };
    }
  }
}

async function askForReply(supabase: SupabaseClient, asset: AssetRow, awaiting: "edit" | "reason", prompt: string): Promise<DecisionOutcome> {
  if (!asset.review) return { message: "این پیش‌نویس در تلگرام فرستاده نشده." };
  const message = await tg<{ message_id: number }>("sendMessage", {
    chat_id: asset.review.chat_id,
    text: prompt,
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
 * else gets their chat id back (handy for setting TELEGRAM_APPROVAL_CHAT_ID)
 * and nothing more.
 */
export async function handleTelegramUpdate(supabase: SupabaseClient, update: TelegramUpdate): Promise<DecisionOutcome | null> {
  if (update.callback_query) {
    const query = update.callback_query;
    const answer = (text: string) =>
      tg("answerCallbackQuery", { callback_query_id: query.id, ...(text ? { text } : {}) }).catch(() => undefined);
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
  const replyTo = message.reply_to_message?.message_id;
  if (!replyTo) return null;

  const { data } = await supabase
    .from("social_assets")
    .select("product_id, review")
    .eq("review->>prompt_id", String(replyTo))
    .maybeSingle();
  const asset = data as { product_id: string; review: ReviewState | null } | null;
  if (!asset?.review?.awaiting) return null;

  return applyDecision(
    supabase,
    asset.product_id,
    asset.review.awaiting === "edit" ? { kind: "edit_text", text: message.text } : { kind: "reject_note", note: message.text },
    "telegram"
  );
}
