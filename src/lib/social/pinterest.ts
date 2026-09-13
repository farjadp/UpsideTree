import "server-only";

import { productLink, truncate } from "@/lib/social/format";
import type { PublishResult, SocialPostInput } from "@/lib/social/types";

// Pinterest API v5. Needs an app with Standard access (Trial access can only
// create pins against api-sandbox.pinterest.com) and a token with
// boards:read, pins:read and pins:write.

const API_HOST = process.env.PINTEREST_API_HOST || "api.pinterest.com";

export function isPinterestConfigured() {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID);
}

export async function postToPinterest({ product, imageUrl, copy }: SocialPostInput): Promise<PublishResult> {
  const response = await fetch(`https://${API_HOST}/v5/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: process.env.PINTEREST_BOARD_ID,
      link: productLink(product, "pinterest"),
      title: truncate(copy.pinterest_title, 100),
      description: truncate(copy.pinterest_description, 800),
      alt_text: truncate(copy.alt_text, 500),
      media_source: { source_type: "image_url", url: imageUrl },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Pinterest: ${data?.message ?? `HTTP ${response.status}`}`);
  }
  return { externalId: data.id, externalUrl: `https://www.pinterest.com/pin/${data.id}/` };
}
