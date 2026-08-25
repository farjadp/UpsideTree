import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createPrintifyOrder,
  sendPrintifyOrderToProduction,
  getPrintifyOrder,
  isPrintifyConfigured,
  PrintifyError,
  type PrintifyAddress,
  type PrintifyLineItem,
} from "@/lib/printify";

// Printify creates orders in "pending" while it calculates costs and picks
// routing; send_to_production during that window is rejected (code 8502).
// Poll until the order leaves pending, then start production. Returns true
// once production has started, false if the order was still settling when
// the window ran out (safe to retry later — the order exists either way).
async function sendToProductionWhenReady(printifyOrderId: string, attempts = 5): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
    try {
      const remote = await getPrintifyOrder(printifyOrderId);
      const status = String(remote.status ?? "").toLowerCase();
      // Anything past the hold states means production already started
      // (e.g. a retry after a previous partial success).
      if (["in-production", "sending-to-production", "fulfilled", "shipped"].includes(status)) {
        return true;
      }
      if (status === "pending") {
        continue;
      }
      await sendPrintifyOrderToProduction(printifyOrderId);
      return true;
    } catch (err) {
      // 8502-style "still pending" rejections are retryable within the
      // window; anything else propagates to the caller's error handling.
      const body = err instanceof PrintifyError ? JSON.stringify(err.body ?? "") : "";
      if (err instanceof PrintifyError && (err.status === 400 && body.includes("8502"))) {
        continue;
      }
      throw err;
    }
  }
  return false;
}

// Fulfillment runs from trusted server contexts only — the Stripe webhook
// (authenticated by signature) and an admin retry action. There is no user
// session in either, so it uses the service-role client.
function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type FulfillmentResult =
  | { ok: true; status: "submitted"; printifyOrderId: string }
  | { ok: true; status: "already_submitted"; printifyOrderId: string }
  | { ok: false; status: "skipped" | "failed"; reason: string; retryable: boolean };

// Minimal shapes for the columns this module actually reads. The project
// has no generated Supabase types, so these stand in for them rather than
// letting `any` spread through the fulfillment path.
type ShippingAddress = {
  first_name?: string;
  last_name?: string;
  line1?: string;
  line2?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  province?: string;
  province_state?: string;
  state?: string;
  postal_code?: string;
  zip?: string;
  country?: string;
};

type OrderItemRecord = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  quantity: number | null;
};

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  payment_status: string | null;
  shipping_address: ShippingAddress | null;
  printify_order_id: string | null;
  fulfillment_status: string | null;
  fulfillment_attempts: number | null;
  fulfillment_claimed_at: string | null;
  order_items: OrderItemRecord[] | null;
};

type ProductRecord = { id: string; name_en: string | null; printify_product_id: string | null };
type VariantRecord = { id: string; printify_variant_id: number | null };

// How long a claim can sit before another attempt may take it over. Long
// enough that a slow-but-alive Printify call won't get double-submitted,
// short enough that a crashed attempt is recoverable without a DBA.
const STALE_CLAIM_MS = 5 * 60 * 1000;

async function logEvent(
  supabase: SupabaseClient,
  entry: {
    event_type: string;
    severity: "info" | "warning" | "error";
    status: string;
    orderId: string;
    request_payload?: unknown;
    response_payload?: unknown;
    error_message?: string;
    duration_ms?: number;
    retry_count?: number;
  }
) {
  // Logging must never be the reason fulfillment fails.
  try {
    await supabase.from("system_event_logs").insert({
      service: "printify",
      event_type: entry.event_type,
      severity: entry.severity,
      status: entry.status,
      trigger_source: "fulfillment",
      related_order_id: entry.orderId,
      request_payload: entry.request_payload ?? null,
      response_payload: entry.response_payload ?? null,
      error_message: entry.error_message ?? null,
      duration_ms: entry.duration_ms ?? null,
      retry_count: entry.retry_count ?? 0,
    });
  } catch (err) {
    console.error("Failed to write fulfillment log:", err);
  }
}

function splitName(fullName: string) {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Customer", last: "-" };
  if (parts.length === 1) return { first: parts[0], last: "-" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function buildAddress(order: OrderRecord): PrintifyAddress | null {
  const shipping: ShippingAddress = order.shipping_address ?? {};
  const { first, last } = splitName(order.customer_name);

  const address1 = shipping.line1 ?? shipping.address_line_1 ?? "";
  const city = shipping.city ?? "";
  const zip = shipping.postal_code ?? shipping.zip ?? "";
  const country = shipping.country ?? "CA";
  const region = shipping.province ?? shipping.province_state ?? shipping.state ?? "";

  if (!address1 || !city || !zip) {
    return null;
  }

  return {
    first_name: shipping.first_name || first,
    last_name: shipping.last_name || last,
    email: order.customer_email,
    phone: order.customer_phone ?? undefined,
    country,
    region,
    address1,
    address2: shipping.line2 ?? shipping.address_line_2 ?? undefined,
    city,
    zip,
  };
}

/**
 * Submit a paid order to Printify and start production.
 *
 * Safe to call more than once for the same order: it claims the order with
 * a conditional update before touching Printify, so a Stripe webhook retry
 * (or an admin clicking retry while the first attempt is in flight) can't
 * create a second print job.
 */
export async function fulfillOrder(orderId: string, trigger: "webhook" | "admin" = "webhook"): Promise<FulfillmentResult> {
  const supabase = getAdminClient();
  const startedAt = Date.now();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return { ok: false, status: "failed", reason: orderError?.message ?? "Order not found.", retryable: false };
  }

  const order = orderRow as OrderRecord;
  const claimToken = `pending:${orderId}`;

  if (order.printify_order_id && order.printify_order_id !== claimToken) {
    // Already on Printify. If production never started (a previous attempt
    // created the order while it was still calculating), finish the job
    // instead of reporting success and leaving it on hold forever.
    if (order.fulfillment_status !== "in_production" && order.fulfillment_status !== "fulfilled") {
      try {
        const sent = await sendToProductionWhenReady(order.printify_order_id);
        if (sent) {
          await supabase
            .from("orders")
            .update({
              fulfillment_status: "in_production",
              fulfillment_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Failed to start production.";
        await supabase.from("orders").update({ fulfillment_error: reason }).eq("id", orderId);
        return { ok: false, status: "failed", reason, retryable: true };
      }
    }
    return { ok: true, status: "already_submitted", printifyOrderId: order.printify_order_id };
  }

  // A leftover claim token means a previous attempt died between claiming
  // the order and hearing back from Printify. Without this, that order
  // would look permanently "already submitted" and could never be retried.
  // Anything older than the stale window is safe to take over; a fresh one
  // is most likely still in flight, so leave it alone.
  if (order.printify_order_id === claimToken) {
    const claimedAt = order.fulfillment_claimed_at ? new Date(order.fulfillment_claimed_at).getTime() : 0;
    const isStale = Date.now() - claimedAt > STALE_CLAIM_MS;

    if (!isStale) {
      return { ok: false, status: "skipped", reason: "Fulfillment is already in progress.", retryable: true };
    }

    await supabase
      .from("orders")
      .update({ printify_order_id: null })
      .eq("id", orderId)
      .eq("printify_order_id", claimToken);
    order.printify_order_id = null;
  }

  // Never print something that hasn't been paid for.
  if (order.payment_status !== "paid") {
    return { ok: false, status: "skipped", reason: "Order is not paid.", retryable: false };
  }

  if (!isPrintifyConfigured()) {
    const reason = "PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID are not set.";
    await supabase.from("orders").update({ fulfillment_error: reason }).eq("id", orderId);
    await logEvent(supabase, {
      event_type: "printify_order_skipped",
      severity: "warning",
      status: "skipped",
      orderId,
      error_message: reason,
    });
    return { ok: false, status: "skipped", reason, retryable: true };
  }

  // ---- Resolve each line to a Printify product + variant ------------------
  const items = order.order_items ?? [];
  if (items.length === 0) {
    return { ok: false, status: "failed", reason: "Order has no items.", retryable: false };
  }

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
  const variantIds = [...new Set(items.map((i) => i.variant_id).filter(Boolean))] as string[];

  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from("products").select("id, name_en, printify_product_id").in("id", productIds),
    variantIds.length
      ? supabase.from("product_variants").select("id, printify_variant_id").in("id", variantIds)
      : Promise.resolve({ data: [] as VariantRecord[] }),
  ]);

  const productMap = new Map<string, ProductRecord>(
    ((products ?? []) as ProductRecord[]).map((p) => [p.id, p])
  );
  const variantMap = new Map<string, VariantRecord>(
    ((variants ?? []) as VariantRecord[]).map((v) => [v.id, v])
  );

  const lineItems: PrintifyLineItem[] = [];
  const unmapped: string[] = [];

  for (const item of items) {
    // product_id is nullable (ON DELETE SET NULL), so a line whose product
    // was deleted since purchase resolves to nothing — treat it as unmapped
    // rather than dereferencing null.
    const product = item.product_id ? productMap.get(item.product_id) : null;
    const variant = item.variant_id ? variantMap.get(item.variant_id) : null;

    const printifyProductId = product?.printify_product_id;
    const printifyVariantId = variant?.printify_variant_id;

    if (!printifyProductId || !printifyVariantId) {
      unmapped.push(product?.name_en ?? item.sku ?? item.product_id ?? `line ${item.id}`);
      continue;
    }

    lineItems.push({
      product_id: String(printifyProductId),
      variant_id: Number(printifyVariantId),
      quantity: Number(item.quantity) || 1,
    });
  }

  // A partially-mapped order must not be half-printed — either the whole
  // order goes to Printify or a human deals with it.
  if (unmapped.length > 0) {
    const reason = `Not linked to Printify: ${unmapped.join(", ")}. Set printify_product_id on the product and printify_variant_id on its variant.`;
    await supabase
      .from("orders")
      .update({ fulfillment_error: reason, fulfillment_attempts: (order.fulfillment_attempts ?? 0) + 1 })
      .eq("id", orderId);
    await logEvent(supabase, {
      event_type: "printify_order_unmapped",
      severity: "warning",
      status: "skipped",
      orderId,
      error_message: reason,
      retry_count: order.fulfillment_attempts ?? 0,
    });
    return { ok: false, status: "skipped", reason, retryable: true };
  }

  const address = buildAddress(order);
  if (!address) {
    const reason = "Shipping address is incomplete (needs street, city and postal code).";
    await supabase.from("orders").update({ fulfillment_error: reason }).eq("id", orderId);
    await logEvent(supabase, {
      event_type: "printify_order_invalid_address",
      severity: "error",
      status: "failed",
      orderId,
      error_message: reason,
    });
    return { ok: false, status: "failed", reason, retryable: false };
  }

  // ---- Claim the order ----------------------------------------------------
  // `.is("printify_order_id", null)` makes this a compare-and-set: whoever
  // wins the race gets rows back, the loser gets none and bails out. The
  // sentinel is replaced with the real id once Printify responds.
  const { data: claimed } = await supabase
    .from("orders")
    .update({
      printify_order_id: claimToken,
      fulfillment_attempts: (order.fulfillment_attempts ?? 0) + 1,
      fulfillment_claimed_at: new Date().toISOString(),
      fulfillment_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .is("printify_order_id", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    const { data: current } = await supabase
      .from("orders")
      .select("printify_order_id")
      .eq("id", orderId)
      .single();
    return {
      ok: true,
      status: "already_submitted",
      printifyOrderId: current?.printify_order_id ?? claimToken,
    };
  }

  const requestPayload = {
    external_id: order.id,
    label: order.order_number,
    line_items: lineItems,
    address_to: address,
  };

  try {
    const created = await createPrintifyOrder(requestPayload);

    // Persist the real Printify id BEFORE trying to start production.
    // Printify has the order from this moment on — if anything below
    // fails, the id must survive or a retry would create a duplicate.
    await supabase
      .from("orders")
      .update({
        printify_order_id: created.id,
        fulfillment_status: "submitted",
        fulfillment_submitted_at: new Date().toISOString(),
        fulfillment_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // A fresh order sits in "pending" while Printify calculates costs and
    // routing; send_to_production during that window fails with code 8502.
    // Poll briefly until it leaves pending, then start production. If it
    // is still settling after the window, leave it: the order is safely
    // created on Printify and the admin retry (or the next webhook) can
    // send it to production once it is ready.
    const sent = await sendToProductionWhenReady(created.id);

    await supabase
      .from("orders")
      .update({
        fulfillment_status: sent ? "in_production" : "submitted",
        fulfillment_error: sent
          ? null
          : "Created on Printify; production start pending (order still calculating). Retry from the admin order page.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    await logEvent(supabase, {
      event_type: "printify_order_submitted",
      severity: "info",
      status: "success",
      orderId,
      request_payload: requestPayload,
      response_payload: created as Record<string, unknown>,
      duration_ms: Date.now() - startedAt,
      retry_count: order.fulfillment_attempts ?? 0,
    });

    return { ok: true, status: "submitted", printifyOrderId: created.id };
  } catch (err) {
    const printifyError = err instanceof PrintifyError ? err : null;
    const reason = err instanceof Error ? err.message : "Unknown Printify error.";

    // Release the claim so a retry is possible — otherwise the sentinel
    // would permanently look like "already submitted".
    await supabase
      .from("orders")
      .update({
        printify_order_id: null,
        fulfillment_error: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("printify_order_id", claimToken);

    await logEvent(supabase, {
      event_type: "printify_order_failed",
      severity: "error",
      status: "failed",
      orderId,
      request_payload: requestPayload,
      response_payload: (printifyError?.body ?? null) as Record<string, unknown> | null,
      error_message: reason,
      duration_ms: Date.now() - startedAt,
      retry_count: order.fulfillment_attempts ?? 0,
    });

    console.error(`Printify fulfillment failed for order ${order.order_number} (${trigger}):`, reason);

    return {
      ok: false,
      status: "failed",
      reason,
      retryable: printifyError?.retryable ?? true,
    };
  }
}
