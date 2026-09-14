// Pinterest Tag (conversion tracking). The base script is loaded by
// <PinterestTag /> in the root layout; these helpers are safe no-ops when the
// tag isn't configured or never loads (dev, blocked by an ad blocker).
// Event reference: https://help.pinterest.com/en/business/article/add-event-codes

type PinterestEvent = "pagevisit" | "addtocart" | "checkout";

type LineItem = { product_id: string; product_name?: string; product_price?: number; product_quantity?: number };

type EventData = {
  value?: number;
  order_quantity?: number;
  currency?: string;
  order_id?: string;
  line_items?: LineItem[];
};

declare global {
  interface Window {
    pintrk?: ((...args: unknown[]) => void) & { queue?: unknown[]; version?: string };
  }
}

export const PINTEREST_TAG_ID = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID;

export function pinTrack(event: PinterestEvent, data: EventData = {}, attempt = 0) {
  if (typeof window === "undefined" || !PINTEREST_TAG_ID) return;
  if (!window.pintrk) {
    // The base script is injected after hydration; wait for it briefly rather
    // than defining pintrk ourselves, which would stop it from loading.
    if (attempt < 10) setTimeout(() => pinTrack(event, data, attempt + 1), 500);
    return;
  }
  try {
    window.pintrk("track", event, { currency: "CAD", ...data });
  } catch {
    // Tracking must never break the storefront.
  }
}
