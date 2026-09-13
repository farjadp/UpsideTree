import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getVariantPrice } from "@/lib/products";

const FREE_SHIPPING_THRESHOLD = 75;
const FLAT_SHIPPING_RATE = 12;
const GIFT_WRAP_FEE = 5;

type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `UT-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      items,
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
      items: CheckoutItem[];
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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }
    if (!customerName || !customerEmail || !shippingAddress?.line1 || !shippingAddress?.city) {
      return NextResponse.json({ error: "Missing required checkout details." }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // 1. RE-VALIDATE every line against the database. Never trust prices,
    // names, or images sent by the client — they are only a shopping-cart
    // convenience, not the source of truth for what gets charged.
    const productIds = [...new Set(items.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name_en, name_fa, price, sale_price, currency, status, sku, featured_image_url, manage_stock, stock_quantity")
      .in("id", productIds);

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const productMap = new Map((products || []).map((product) => [product.id, product]));

    const variantIds = items.map((item) => item.variantId).filter((id): id is string => Boolean(id));
    let variantMap = new Map<string, any>();
    if (variantIds.length > 0) {
      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select("id, product_id, name_en, name_fa, price, sale_price, cost_price, sku, stock_quantity, image_url")
        .in("id", variantIds);

      if (variantsError) {
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
      variantMap = new Map((variants || []).map((variant) => [variant.id, variant]));
    }

    const lineItems: Array<{
      product: any;
      variant: any;
      quantity: number;
      unitPrice: number;
      salePrice: number | null;
      sku: string;
      name: string;
      image: string | null;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `A product in your cart is no longer available.` }, { status: 400 });
      }
      if (String(product.status).toLowerCase() !== "active") {
        return NextResponse.json({ error: `${product.name_en} is no longer available.` }, { status: 400 });
      }

      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      if (item.variantId && !variant) {
        return NextResponse.json({ error: `A selected option for ${product.name_en} is no longer available.` }, { status: 400 });
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
      if (product.manage_stock !== false && availableStock !== null && availableStock < quantity) {
        return NextResponse.json({ error: `Not enough stock for ${product.name_en}.` }, { status: 400 });
      }

      // A variant with its own price (e.g. per-size Printify pricing) is
      // never discounted by the product-level sale price.
      const { price, salePrice } = getVariantPrice(product, variant);
      const unitPrice = salePrice ?? price;

      // Never charge less than the print cost. A variant without its own
      // price falls back to the product price, which for a large size can
      // be far below what Printify bills us.
      const cost = variant?.cost_price != null ? Number(variant.cost_price) : null;
      if (!(unitPrice > 0) || (cost !== null && unitPrice < cost)) {
        console.error(
          `Checkout blocked: ${product.name_en} ${variant?.name_en ?? ""} priced ${unitPrice} below cost ${cost}`
        );
        return NextResponse.json(
          { error: `${product.name_en} isn't available in that option right now.` },
          { status: 400 }
        );
      }

      lineItems.push({
        product,
        variant,
        quantity,
        unitPrice,
        salePrice,
        sku: variant?.sku || product.sku || product.id,
        name: variant ? `${product.name_en} — ${variant.name_en}` : product.name_en,
        image: variant?.image_url || product.featured_image_url || null,
      });
    }

    // 2. Compute totals server-side.
    const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;
    const shippingCost = subtotal + giftWrapFee >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;

    let taxAmount = 0;
    const province = shippingAddress.province || shippingAddress.state || null;
    const country = shippingAddress.country || "CA";
    let taxQuery = supabase
      .from("tax_rates")
      .select("rate")
      .eq("active", true)
      .eq("country", country);
    taxQuery = province ? taxQuery.eq("province", province) : taxQuery.is("province", null);
    const { data: taxRate } = await taxQuery.maybeSingle();
    if (taxRate) {
      taxAmount = Math.round((subtotal + giftWrapFee + shippingCost) * Number(taxRate.rate) * 100) / 100;
    }

    const total = subtotal + giftWrapFee + shippingCost + taxAmount;

    // 3. Persist the cart (so orders.cart_id points at a real record) and the order.
    // IDs are generated here rather than read back with .select() — a guest
    // has no SELECT policy on their own just-created row (only "view your
    // own" via auth.uid(), which a guest doesn't have), and Postgres checks
    // SELECT policies to satisfy RETURNING even right after a successful
    // INSERT. Supplying our own id sidesteps that entirely.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    const cartId = crypto.randomUUID();

    const { error: cartError } = await supabase.from("carts").insert({
      id: cartId,
      customer_id: user?.id || null,
      session_id: crypto.randomUUID(),
      status: "converted",
      currency: "CAD",
      gift_wrap: giftWrap,
      gift_message: giftMessage || null,
      expires_at: expiresAt.toISOString(),
    });

    if (cartError) {
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    const { error: cartItemsError } = await supabase.from("cart_items").insert(
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

    const { error: orderError } = await supabase.from("orders").insert({
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
      currency: "CAD",
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

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      lineItems.map((item) => ({
        order_id: orderId,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_snapshot: { name_en: item.product.name_en, name_fa: item.product.name_fa, image: item.image, sku: item.sku },
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sale_price: item.salePrice,
        total_price: item.unitPrice * item.quantity,
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
        currency: "cad",
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
        price_data: { currency: "cad", product_data: { name: "Gift wrapping" }, unit_amount: Math.round(giftWrapFee * 100) },
        quantity: 1,
      });
    }
    if (shippingCost > 0) {
      stripeLineItems.push({
        price_data: { currency: "cad", product_data: { name: "Shipping" }, unit_amount: Math.round(shippingCost * 100) },
        quantity: 1,
      });
    }
    if (taxAmount > 0) {
      stripeLineItems.push({
        price_data: { currency: "cad", product_data: { name: "Tax" }, unit_amount: Math.round(taxAmount * 100) },
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
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message || "Checkout failed." }, { status: 500 });
  }
}
