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
      // Compare-and-set on payment_status: only the delivery that actually
      // flips the order to paid gets a row back. Stripe retries and the
      // completed/async_payment_succeeded pair then can't re-stamp paid_at
      // or send a second confirmation email.
      const { data: transitioned } = await supabase
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

      const { data: order } = await supabase
        .from("orders")
        .select("cart_id")
        .eq("id", orderId)
        .single();

      if (order?.cart_id) {
        await supabase.from("carts").update({ status: "converted" }).eq("id", order.cart_id);
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
    }
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const session = event.data.object as CheckoutSessionEvent;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      await supabase
        .from("orders")
        .update({ status: "payment_failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }
  }

  return NextResponse.json({ received: true });
}
