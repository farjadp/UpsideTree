import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  CheckoutError,
  isStoreCurrency,
  priceOrder,
  type CheckoutAddress,
  type CheckoutItemInput,
} from "@/lib/checkout-pricing";

// Live order summary for the checkout page: goods, real shipping and tax in
// the customer's currency, computed exactly as /api/checkout will charge.
// Shipping (and so tax and total) stays null until the address is complete.

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      items?: CheckoutItemInput[];
      shippingAddress?: CheckoutAddress;
      currency?: string;
      giftWrap?: boolean;
    };

    const priced = await priceOrder({
      supabase,
      items: body.items ?? [],
      address: body.shippingAddress ?? null,
      currency: isStoreCurrency(body.currency) ? body.currency : "CAD",
      giftWrap: Boolean(body.giftWrap),
      requireShipping: false,
    });

    return NextResponse.json({
      currency: priced.currency,
      lines: priced.lines.map((line) => ({
        productId: line.product.id,
        variantId: line.variant?.id ?? null,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      subtotal: priced.subtotal,
      giftWrapFee: priced.giftWrapFee,
      shipping: priced.shipping,
      tax: priced.tax,
      total: priced.total,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout quote failed:", error);
    return NextResponse.json({ error: "Couldn't calculate your order total." }, { status: 500 });
  }
}
