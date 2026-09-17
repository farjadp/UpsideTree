import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { CheckoutError, isStoreCurrency, priceOrder, type CheckoutItemInput } from "@/lib/checkout-pricing";

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `UT-${datePart}-${randomPart}`;
}

// Carts, orders and their items are written with the service role only.
// Customers and guests have no INSERT policy on those tables: with one, anyone
// holding the public anon key could write an order marked paid, at any total,
// straight to Supabase and skip this route's pricing.
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
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      items,
      currency: requestedCurrency,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      billingSameAsShipping = true,
      giftWrap = false,
      giftMessage,
      orderNotes,
    }: {
      items: CheckoutItemInput[];
      currency?: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress: Record<string, string>;
      billingAddress?: Record<string, string>;
      billingSameAsShipping?: boolean;
      giftWrap?: boolean;
      giftMessage?: string;
      orderNotes?: string;
    } = body;

    const currency = isStoreCurrency(requestedCurrency) ? requestedCurrency : "CAD";
    if (!customerName || !customerEmail || !shippingAddress?.line1 || !shippingAddress?.city) {
      return NextResponse.json({ error: "Missing required checkout details." }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // 1-2. Validate lines, then price goods, real Printify shipping and tax
    // in the customer's currency (same function as the checkout quote).
    const priced = await priceOrder({
      supabase,
      items,
      address: shippingAddress,
      currency,
      giftWrap,
      requireShipping: true,
    });
    const lineItems = priced.lines;
    const { subtotal, giftWrapFee, tax: taxAmount } = priced;
    const shippingCost = priced.shipping ?? 0;
    const total = priced.total ?? 0;
    const stripeCurrency = currency.toLowerCase();

    // 3. Persist the cart (so orders.cart_id points at a real record) and the
    // order, from the prices computed above. IDs are generated here so the
    // rows can be linked without reading them back.
    const admin = getAdminClient();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    const cartId = crypto.randomUUID();

    const { error: cartError } = await admin.from("carts").insert({
      id: cartId,
      customer_id: user?.id || null,
      session_id: crypto.randomUUID(),
      status: "converted",
      currency,
      gift_wrap: giftWrap,
      gift_message: giftMessage || null,
      expires_at: expiresAt.toISOString(),
    });

    if (cartError) {
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    const { error: cartItemsError } = await admin.from("cart_items").insert(
      lineItems.map((item) => ({
        cart_id: cartId,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sale_price: item.salePrice,
        product_snapshot: { name_en: item.product.name_en, name_fa: item.product.name_fa, image: item.image },
      }))
    );

    if (cartItemsError) {
      return NextResponse.json({ error: cartItemsError.message }, { status: 500 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const orderNumber = generateOrderNumber();
    const orderId = crypto.randomUUID();

    const { error: orderError } = await admin.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_id: user?.id || null,
      guest_email: user ? null : customerEmail,
      cart_id: cartId,
      status: "pending_payment",
      payment_status: "unpaid",
      subtotal,
      gift_wrap_fee: giftWrapFee,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      total,
      currency,
      // CAD → charge currency; divide amounts by this to report in CAD.
      exchange_rate: priced.exchangeRate,
      shipping_address: shippingAddress,
      billing_address: billingSameAsShipping ? shippingAddress : (billingAddress || shippingAddress),
      billing_same_as_shipping: billingSameAsShipping,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      gift_wrap: giftWrap,
      gift_message: giftMessage || null,
      order_notes: orderNotes || null,
      payment_method: "stripe",
      ip_address: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
      user_agent: request.headers.get("user-agent"),
    });

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { error: orderItemsError } = await admin.from("order_items").insert(
      lineItems.map((item) => ({
        order_id: orderId,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_snapshot: { name_en: item.product.name_en, name_fa: item.product.name_fa, image: item.image, sku: item.sku },
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sale_price: item.salePrice,
        total_price: Math.round(item.unitPrice * item.quantity * 100) / 100,
        sku: item.sku,
      }))
    );

    if (orderItemsError) {
      return NextResponse.json({ error: orderItemsError.message }, { status: 500 });
    }

    // 4. Create the Stripe Checkout Session and hand back the redirect URL.
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const stripe = getStripe();

    const stripeLineItems: Array<{ price_data: any; quantity: number }> = lineItems.map((item) => ({
      price_data: {
        currency: stripeCurrency,
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : undefined,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    if (giftWrapFee > 0) {
      stripeLineItems.push({
        price_data: { currency: stripeCurrency, product_data: { name: "Gift wrapping" }, unit_amount: Math.round(giftWrapFee * 100) },
        quantity: 1,
      });
    }
    if (shippingCost > 0) {
      stripeLineItems.push({
        price_data: { currency: stripeCurrency, product_data: { name: "Shipping" }, unit_amount: Math.round(shippingCost * 100) },
        quantity: 1,
      });
    }
    if (taxAmount > 0) {
      stripeLineItems.push({
        price_data: { currency: stripeCurrency, product_data: { name: "Tax" }, unit_amount: Math.round(taxAmount * 100) },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems,
      customer_email: customerEmail,
      success_url: `${origin}/checkout/success?order=${orderNumber}`,
      cancel_url: `${origin}/checkout?cancelled=1`,
      metadata: { order_id: orderId, order_number: orderNumber },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message || "Checkout failed." }, { status: 500 });
  }
}
