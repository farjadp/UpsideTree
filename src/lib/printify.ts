import "server-only";

// Thin Printify API client. Deliberately narrow — only the calls the
// fulfillment pipeline actually makes, so there's no dead surface to keep
// in sync with their docs.
//
// Docs: https://developers.printify.com/

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

export class PrintifyError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** 429 and 5xx are worth retrying; a 4xx usually means the payload is wrong. */
  readonly retryable: boolean;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PrintifyError";
    this.status = status;
    this.body = body;
    this.retryable = status === 429 || status >= 500;
  }
}

function getConfig() {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;

  if (!token) {
    throw new Error("PRINTIFY_API_TOKEN is not set — cannot reach Printify.");
  }
  if (!shopId) {
    throw new Error("PRINTIFY_SHOP_ID is not set — cannot reach Printify.");
  }

  return { token, shopId };
}

export function isPrintifyConfigured() {
  return Boolean(process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID);
}

async function printifyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getConfig();

  const response = await fetch(`${PRINTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Fulfillment must never be served from a cache.
    cache: "no-store",
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : response.statusText;
    throw new PrintifyError(`Printify ${response.status}: ${detail}`, response.status, body);
  }

  return body as T;
}

export type PrintifyUploadedImage = {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
  upload_time: string;
};

/**
 * Upload artwork to the Printify media library so it can be placed on a
 * blueprint. Accepts raw bytes (base64'd here) — Printify also takes a
 * public URL, but a local print file has none.
 *
 * Note this is account-level, not shop-level: uploaded images are reusable
 * across every product in the account.
 */
export async function uploadPrintifyImage(
  fileName: string,
  contents: Buffer | Uint8Array
): Promise<PrintifyUploadedImage> {
  const base64 = Buffer.from(contents).toString("base64");

  return printifyFetch<PrintifyUploadedImage>("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, contents: base64 }),
  });
}

export type PrintifyVariant = {
  id: number;
  sku: string | null;
  title: string;
  price: number; // cents
  cost: number; // cents
  is_enabled: boolean;
  is_default: boolean;
  // Option *value* ids (not option-group ids) — e.g. [1189, 2621] for
  // "11oz / Black". Resolve these against the product's top-level `options`
  // to get each value's real type ("size", "color", ...) rather than
  // guessing from position in `title`, which isn't consistent across
  // blueprints (mugs list size-then-color, apparel usually the reverse).
  options?: number[];
};

export type PrintifyOptionGroup = {
  name: string;
  type: string; // "size" | "color" | ... — this is the reliable signal
  values: Array<{ id: number; title: string }>;
};

export type PrintifyProduct = {
  id: string;
  title: string;
  description?: string;
  blueprint_id: number;
  print_provider_id: number;
  visible?: boolean;
  variants: PrintifyVariant[];
  images?: Array<{ src: string; is_default?: boolean; variant_ids?: number[] }>;
  options?: PrintifyOptionGroup[];
};

type PrintifyProductPage = {
  current_page: number;
  last_page: number;
  total: number;
  data: PrintifyProduct[];
};

/**
 * Every product in the connected shop. Paginated by Printify; this walks
 * the pages so callers get one list. Capped so a huge shop can't hang an
 * admin page load.
 */
export async function listPrintifyProducts(maxPages = 10): Promise<PrintifyProduct[]> {
  const { shopId } = getConfig();
  const collected: PrintifyProduct[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await printifyFetch<PrintifyProductPage>(
      `/shops/${shopId}/products.json?limit=50&page=${page}`
    );

    collected.push(...(result.data ?? []));

    if (!result.last_page || page >= result.last_page) {
      break;
    }
  }

  return collected;
}

export async function getPrintifyProduct(printifyProductId: string): Promise<PrintifyProduct> {
  const { shopId } = getConfig();
  return printifyFetch<PrintifyProduct>(`/shops/${shopId}/products/${printifyProductId}.json`);
}

export type PrintifyAddress = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

export type PrintifyLineItem = {
  product_id: string;
  variant_id: number;
  quantity: number;
};

export type PrintifyOrderResponse = {
  id: string;
  status?: string;
  [key: string]: unknown;
};

export async function createPrintifyOrder(payload: {
  external_id: string;
  label: string;
  line_items: PrintifyLineItem[];
  address_to: PrintifyAddress;
  shipping_method?: number;
  send_shipping_notification?: boolean;
}): Promise<PrintifyOrderResponse> {
  const { shopId } = getConfig();

  return printifyFetch<PrintifyOrderResponse>(`/shops/${shopId}/orders.json`, {
    method: "POST",
    body: JSON.stringify({
      shipping_method: 1,
      send_shipping_notification: false,
      ...payload,
    }),
  });
}

// Printify creates orders on hold; this is what actually starts printing.
export async function sendPrintifyOrderToProduction(printifyOrderId: string) {
  const { shopId } = getConfig();

  return printifyFetch<unknown>(`/shops/${shopId}/orders/${printifyOrderId}/send_to_production.json`, {
    method: "POST",
  });
}

export async function getPrintifyOrder(printifyOrderId: string): Promise<PrintifyOrderResponse> {
  const { shopId } = getConfig();
  return printifyFetch<PrintifyOrderResponse>(`/shops/${shopId}/orders/${printifyOrderId}.json`);
}
