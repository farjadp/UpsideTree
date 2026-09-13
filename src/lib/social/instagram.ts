import "server-only";

import { displayLink, hashtags, priceLine, truncate } from "@/lib/social/format";
import type { PublishResult, SocialPostInput } from "@/lib/social/types";

// Instagram Graph API content publishing: create a media container from a
// public JPEG URL, wait for it to finish processing, then publish it.
// INSTAGRAM_GRAPH_HOST is graph.facebook.com for tokens from Facebook Login
// (IG account linked to a Page) or graph.instagram.com for Instagram Login.

const GRAPH_HOST = process.env.INSTAGRAM_GRAPH_HOST || "graph.facebook.com";
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

export function isInstagramConfigured() {
  return Boolean(process.env.INSTAGRAM_USER_ID && process.env.INSTAGRAM_ACCESS_TOKEN);
}

async function graph(path: string, init: { method: "GET" | "POST"; params: Record<string, string> }) {
  const url = new URL(`https://${GRAPH_HOST}/${GRAPH_VERSION}/${path}`);
  const params = new URLSearchParams({ ...init.params, access_token: process.env.INSTAGRAM_ACCESS_TOKEN! });
  if (init.method === "GET") url.search = params.toString();

  const response = await fetch(url, {
    method: init.method,
    body: init.method === "POST" ? params : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(`Instagram: ${data?.error?.message ?? `HTTP ${response.status}`}`);
  }
  return data;
}

export async function postToInstagram({ product, imageUrl, copy }: SocialPostInput): Promise<PublishResult> {
  const userId = process.env.INSTAGRAM_USER_ID!;
  const price = priceLine(product);

  // Links in captions aren't clickable on Instagram; the bio link carries the click.
  const footer = [
    price ? `💳 ${price}` : null,
    `🔗 لینک خرید در بیو | Link in bio`,
    displayLink(product),
    "",
    hashtags([...copy.instagram_hashtags, "UpsideTree"], 30),
  ]
    .filter((line) => line !== null)
    .join("\n");
  const caption = `${truncate(copy.instagram_caption.trim(), 2200 - footer.length - 4)}\n\n${footer}`;

  const container = await graph(`${userId}/media`, {
    method: "POST",
    params: { image_url: imageUrl, caption, alt_text: truncate(copy.alt_text, 1000) },
  });

  // Images usually finish in a few seconds.
  for (let attempt = 0; attempt < 15; attempt++) {
    const { status_code: status } = await graph(container.id, { method: "GET", params: { fields: "status_code" } });
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`Instagram: media container ${status}.`);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  const published = await graph(`${userId}/media_publish`, { method: "POST", params: { creation_id: container.id } });
  const media = await graph(published.id, { method: "GET", params: { fields: "permalink" } }).catch(() => null);
  return { externalId: published.id, externalUrl: media?.permalink ?? null };
}
