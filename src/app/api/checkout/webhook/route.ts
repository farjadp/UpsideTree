import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/fulfillment";
import { sendOrderConfirmationEmail } from "@/lib/order-emails";

// Stripe webhooks have no Supabase user session — there is no cookie, no
// auth.uid(). Signature verification (below) IS the authentication for this
// route, so it intentionally uses the service-role client to update the
// order once that signature has been checked. This is different from the
// service-role *fallback* pattern removed elsewhere in the codebase: there
// the service role covered for a request with no auth check at all; here
// it's the one legitimate way for a trusted server-to-server callback to
// finalize an order that an anonymous guest may have placed.
// Only the fields this route reads off a Checkout Session. `payment_intent`
// is a string id when not expanded, which is the shape we get here.
type CheckoutSessionEvent = {
  metadata?: { order_id?: string; order_number?: string } | null;
  payment_intent?: string | null;
  // "paid" | "unpaid" | "no_payment_required". A delayed method (bank debit)
  // completes the session while still "unpaid"; the money is only in when
  // checkout.session.async_payment_succeeded arrives.
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
};

// Fulfillment can poll Printify for ~20 s after the payment bookkeeping.
export const maxDuration = 60;

// Each Stripe line is rounded to the cent separately, so its total can drift
// from orders.total by a cent or two. Anything beyond this is not rounding.
const AMOUNT_TOLERANCE_CENTS = 5;

function serverError(message: string) {
  console.error(message);
  // A 5xx makes Stripe retry the event, which is what we want when our own
  // write failed and the payment would otherwise be recorded nowhere.
  return NextResponse.json({ error: "Could not record the event." }, { status: 500 });
}

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

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", detail);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getAdminClient();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as CheckoutSessionEvent;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      if (session.payment_status !== "paid") {
        // Wait for async_payment_succeeded; nothing is owed to Printify yet.
        console.warn(`Order ${orderId}: session completed with payment_status=${session.payment_status}; waiting for payment.`);
        return NextResponse.json({ received: true });
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, cart_id, total, currency, payment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError) {
        return serverError(`Order ${orderId}: could not load order for payment: ${orderError.message}`);
      }
      if (!order) {
        // Retrying can't make a missing order appear.
        console.error(`Stripe payment for unknown order ${orderId} (session ${session.payment_intent ?? "no payment intent"}).`);
        return NextResponse.json({ received: true });
      }

      if (order.payment_status !== "paid") {
        const expectedCents = Math.round(Number(order.total) * 100);
        const paidCents = session.amount_total ?? -1;
        const currencyMatches = String(order.currency ?? "").toLowerCase() === String(session.currency ?? "").toLowerCase();

        if (!currencyMatches || Math.abs(paidCents - expectedCents) > AMOUNT_TOLERANCE_CENTS) {
          // Don't mark paid or print it: a human has to look at this one.
          const reason = `Payment mismatch: Stripe charged ${paidCents / 100} ${session.currency?.toUpperCase()}, order total is ${order.total} ${order.currency}. Not marked paid — check Stripe before fulfilling.`;
          console.error(`Order ${orderId}: ${reason}`);
          const { error: flagError } = await supabase
            .from("orders")
            .update({
              fulfillment_error: reason,
              stripe_payment_intent_id: session.payment_intent || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
          if (flagError) {
            return serverError(`Order ${orderId}: could not flag payment mismatch: ${flagError.message}`);
          }
          return NextResponse.json({ received: true });
        }
      }

      // Compare-and-set on payment_status: only the delivery that actually
      // flips the order to paid gets a row back. Stripe retries and the
      // completed/async_payment_succeeded pair then can't re-stamp paid_at
      // or send a second confirmation email.
      const { data: transitioned, error: paidError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "processing",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .or("payment_status.is.null,payment_status.neq.paid")
        .select("id");

      if (paidError) {
        return serverError(`Order ${orderId}: payment received but not recorded: ${paidError.message}`);
      }

      if (order.cart_id) {
        const { error: cartError } = await supabase.from("carts").update({ status: "converted" }).eq("id", order.cart_id);
        if (cartError) console.error(`Order ${orderId}: cart ${order.cart_id} not marked converted: ${cartError.message}`);
      }

      // Confirmation before fulfillment: fulfillment can take ~20 s, and if
      // the function is cut off there the email must already be out.
      // At-most-once: if this send fails, a retry won't resend (the order is
      // already paid). A lost confirmation beats a duplicate one; the
      // failure is logged for manual follow-up.
      if (transitioned && transitioned.length > 0) {
        const emailResult = await sendOrderConfirmationEmail(supabase, orderId);
        if (!emailResult.ok) {
          const log = emailResult.skipped ? console.warn : console.error;
          log(`Order ${orderId} confirmation email not sent: ${emailResult.reason}`);
        }
      }

      // On-demand fulfillment: the moment payment lands, hand the order to
      // Printify and start production. Awaited (not fire-and-forget) so a
      // serverless function can't be frozen mid-request — but its failure
      // must not fail the webhook, or Stripe would retry the whole event
      // and re-run the payment bookkeeping above. fulfillOrder() is
      // idempotent, so a retry that does get through is still safe.
      const result = await fulfillOrder(orderId, "webhook");
      if (!result.ok) {
        console.error(`Order ${orderId} paid but not fulfilled (${result.status}): ${result.reason}`);
      }
    }
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const session = event.data.object as CheckoutSessionEvent;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      // Never downgrade an order that did get paid (events can arrive out of order).
      const { error } = await supabase
        .from("orders")
        .update({ status: "payment_failed", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .or("payment_status.is.null,payment_status.neq.paid");
      if (error) {
        return serverError(`Order ${orderId}: could not mark payment failed: ${error.message}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
