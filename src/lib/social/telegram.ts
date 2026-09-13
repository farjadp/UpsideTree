import "server-only";

import { priceLine, productLink, truncate } from "@/lib/social/format";
import type { PublishResult, SocialPostInput } from "@/lib/social/types";

// Bot API: the bot must be an admin of the channel.
// TELEGRAM_CHANNEL_ID is "@channelname" or the numeric "-100…" id.

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function postToTelegram({ product, imageUrl, copy }: SocialPostInput): Promise<PublishResult> {
  const link = productLink(product, "telegram");
  const price = priceLine(product);

  const footer = [price ? `💳 ${price}` : null, `🛒 <a href="${escapeHtml(link)}">مشاهده و خرید | Shop now</a>`]
    .filter(Boolean)
    .join("\n");
  // Photo captions are capped at 1024 characters, entities included.
  const body = truncate(copy.telegram_caption.trim(), 1024 - footer.length - 40);
  const caption = `${escapeHtml(body)}\n\n${footer}`;

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHANNEL_ID,
      photo: imageUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "🛒 مشاهده محصول | View product", url: link }]] },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(`Telegram: ${data?.description ?? `HTTP ${response.status}`}`);
  }

  const messageId = String(data.result.message_id);
  const username = data.result.chat?.username as string | undefined;
  return { externalId: messageId, externalUrl: username ? `https://t.me/${username}/${messageId}` : null };
}
