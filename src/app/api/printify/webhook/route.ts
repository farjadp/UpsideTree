import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { syncPrintifyCatalog } from "@/lib/printify-sync";
import { sendOrderShippedEmail } from "@/lib/order-emails";

// Printify → Upside Tree callbacks. Same trust model as the Stripe webhook:
// there is no user session here, the HMAC signature IS the authentication,
// and once it checks out the service-role client is the legitimate way to
// apply what Printify tells us.
//
// Registered topics (scripts/register_printify_webhooks.ts):
//   product:publish:started / product:deleted  → re-mirror the catalog
//   order:sent-to-production                   → mark items in production
//   order:shipment:created                     → tracking number + shipped
//   order:shipment:delivered                   → delivered
//
// Payload shape: { id, type, created_at, resource: { id, type, data } }
// Signature:     X-Pfy-Signature: sha256=<hex hmac-sha256 of raw body>

export const maxDuration = 120;

type PrintifyWebhookEvent = {
  id?: string;
  type?: string;
  resource?: {
    id?: string | number;
    type?: string;
    data?: {
      shipment?: {
        carrier?: string;
        number?: string;
        url?: string;
      };
      carrier?: string;
      number?: string;
      url?: string;
    } | null;
  } | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifySignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PRINTIFY_WEBHOOK_SECRET is not set — rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-pfy-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PrintifyWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const topic = event.type ?? "";
  const supabase = getAdminClient();

  try {
    // ---- Catalog events: re-mirror. The event only says "something about
    // this product changed"; the sync diffs the whole (small) catalog, which
    // also covers events Printify doesn't send (e.g. plain edits publish as
    // publish:started too).
    if (topic.startsWith("product:")) {
      const result = await syncPrintifyCatalog(supabase);
      return NextResponse.json({ received: true, sync: { imported: result.imported.length, errors: result.errors } });
    }

    // ---- Order lifecycle events: keyed by our stored printify_order_id.
    if (topic.startsWith("order:")) {
      const printifyOrderId = event.resource?.id != null ? String(event.resource.id) : null;
      if (!printifyOrderId) {
        return NextResponse.json({ received: true, ignored: "no resource id" });
      }

      const now = new Date().toISOString();

      // orders.status has no "shipped"/"delivered" values (its CHECK allows
      // pending_payment…completed), so shipping progress lives in
      // fulfillment_status + shipped_at/delivered_at, and delivery is what
      // completes the order. Errors are surfaced as 5xx so Printify retries
      // instead of the tracking number being silently dropped.
      if (topic === "order:sent-to-production") {
        const { error } = await supabase
          .from("orders")
          .update({ fulfillment_status: "in_production", updated_at: now })
          .eq("printify_order_id", printifyOrderId);
        if (error) throw new Error(error.message);
      } else if (topic === "order:shipment:created") {
        const data = event.resource?.data;
        const shipment = data?.shipment ?? data ?? {};
        const { data: firstShipment, error } = await supabase
          .from("orders")
          .update({
            fulfillment_status: "fulfilled",
            shipped_at: now,
            tracking_carrier: shipment.carrier ?? null,
            tracking_number: shipment.number ?? null,
            tracking_url: shipment.url ?? null,
            updated_at: now,
          })
          .eq("printify_order_id", printifyOrderId)
          .is("shipped_at", null)
          .select("id");
        if (error) throw new Error(error.message);

        // Only the delivery that first marks the order shipped emails the
        // customer; a redelivered webhook matches no row and sends nothing.
        for (const row of firstShipment ?? []) {
          const emailResult = await sendOrderShippedEmail(supabase, row.id);
          if (!emailResult.ok) {
            const log = emailResult.skipped ? console.warn : console.error;
            log(`Order ${row.id} shipping email not sent: ${emailResult.reason}`);
          }
        }
      } else if (topic === "order:shipment:delivered") {
        const { error } = await supabase
          .from("orders")
          .update({ status: "completed", delivered_at: now, updated_at: now })
          .eq("printify_order_id", printifyOrderId);
        if (error) throw new Error(error.message);
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, ignored: topic });
  } catch (err) {
    // 5xx so Printify retries the delivery.
    const message = err instanceof Error ? err.message : "Webhook handling failed.";
    console.error(`Printify webhook ${topic} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
