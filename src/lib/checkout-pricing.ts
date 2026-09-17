import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeTax, normalizeCaProvince, type TaxRateRow } from "@/lib/tax";
import { getVariantPrice } from "@/lib/products";
import { PrintifyError, quotePrintifyShipping, type PrintifyLineItem } from "@/lib/printify";
import {
  convertFromCad,
  getUsdRates,
  roundMoney,
  usdCostToCad,
  STORE_CURRENCIES,
  type StoreCurrency,
} from "@/lib/fx";

// One pricing path for the live quote on the checkout page and for the
// order actually charged, so the customer pays exactly what they were shown.
//
// Prices live in CAD. Shipping is what Printify bills for these items to
// this address (USD, converted to CAD with the card-fee buffer), not a flat
// rate: a mug to Toronto costs USD 15.49 to ship, a canvas far more.

export type CheckoutItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export type CheckoutAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export class CheckoutError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Non-Printify products (made or stocked locally) ship at this flat rate.
function localShippingCad() {
  const value = Number(process.env.LOCAL_SHIPPING_CAD);
  return Number.isFinite(value) && value >= 0 ? value : 12;
}

// Optional: free shipping above this CAD subtotal. Unset = never free, since
// Printify still bills shipping on every order.
function freeShippingThresholdCad() {
  const value = Number(process.env.FREE_SHIPPING_THRESHOLD_CAD);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Optional percentage added to Printify's shipping (e.g. 10 for packaging/risk).
function shippingMarkup() {
  const value = Number(process.env.SHIPPING_MARKUP_PERCENT);
  return Number.isFinite(value) && value > 0 ? value / 100 : 0;
}

const GIFT_WRAP_FEE_CAD = 5;

export function isStoreCurrency(value: unknown): value is StoreCurrency {
  return typeof value === "string" && (STORE_CURRENCIES as readonly string[]).includes(value);
}

/** Enough of an address for Printify to quote shipping. */
export function canQuoteShipping(address: CheckoutAddress | null | undefined) {
  return Boolean(address?.country && address.city && address.postal_code && address.line1);
}

type ProductRow = {
  id: string;
  name_en: string;
  name_fa: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  status: string | null;
  sku: string | null;
  featured_image_url: string | null;
  manage_stock: boolean | null;
  stock_quantity: number | null;
  printify_product_id: string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  name_en: string | null;
  name_fa: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  cost_price: number | string | null;
  sku: string | null;
  stock_quantity: number | null;
  image_url: string | null;
  printify_variant_id: number | string | null;
};

export type PricedLine = {
  product: ProductRow;
  variant: VariantRow | null;
  quantity: number;
  /** In the charge currency. */
  unitPrice: number;
  salePrice: number | null;
  sku: string;
  name: string;
  image: string | null;
};

export type PricedOrder = {
  currency: StoreCurrency;
  /** CAD → charge currency multiplier used for every amount. */
  exchangeRate: number;
  lines: PricedLine[];
  subtotal: number;
  giftWrapFee: number;
  /** null until the address is complete enough to quote. */
  shipping: number | null;
  tax: number;
  total: number | null;
};

export async function priceOrder({
  supabase,
  items,
  address,
  currency,
  giftWrap = false,
  requireShipping,
}: {
  supabase: SupabaseClient;
  items: CheckoutItemInput[];
  address: CheckoutAddress | null;
  currency: StoreCurrency;
  giftWrap?: boolean;
  /** Payment needs a real shipping amount; a quote can return null. */
  requireShipping: boolean;
}): Promise<PricedOrder> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError(400, "Your cart is empty.");
  }

  const rates = await getUsdRates();
  const toCharge = (cad: number) => convertFromCad(cad, currency, rates);
  const exchangeRate = currency === "CAD" ? 1 : rates.EUR / rates.CAD;

  // 1. Re-validate every line against the database; never trust client prices.
  const productIds = [...new Set(items.map((item) => item.productId))];
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name_en, name_fa, price, sale_price, status, sku, featured_image_url, manage_stock, stock_quantity, printify_product_id")
    .in("id", productIds);
  if (productsError) throw new CheckoutError(500, productsError.message);
  const productMap = new Map((products as ProductRow[] | null ?? []).map((p) => [p.id, p]));

  const variantIds = items.map((item) => item.variantId).filter((id): id is string => Boolean(id));
  const variantMap = new Map<string, VariantRow>();
  if (variantIds.length > 0) {
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, product_id, name_en, name_fa, price, sale_price, cost_price, sku, stock_quantity, image_url, printify_variant_id")
      .in("id", variantIds);
    if (variantsError) throw new CheckoutError(500, variantsError.message);
    for (const variant of (variants as VariantRow[] | null) ?? []) variantMap.set(variant.id, variant);
  }

  const lines: PricedLine[] = [];
  let subtotalCad = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new CheckoutError(400, "A product in your cart is no longer available.");
    if (String(product.status).toLowerCase() !== "active") {
      throw new CheckoutError(400, `${product.name_en} is no longer available.`);
    }

    const variant = item.variantId ? variantMap.get(item.variantId) ?? null : null;
    if (item.variantId && !variant) {
      throw new CheckoutError(400, `A selected option for ${product.name_en} is no longer available.`);
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    if (product.manage_stock !== false && availableStock !== null && availableStock < quantity) {
      throw new CheckoutError(400, `Not enough stock for ${product.name_en}.`);
    }

    // A variant with its own price (per-size Printify pricing) is never
    // discounted by the product-level sale price.
    const { price, salePrice } = getVariantPrice(product, variant);
    const unitCad = salePrice ?? price;

    // Never charge less than the print cost (both CAD).
    const cost = variant?.cost_price != null ? Number(variant.cost_price) : null;
    if (!(unitCad > 0) || (cost !== null && unitCad < cost)) {
      console.error(`Checkout blocked: ${product.name_en} ${variant?.name_en ?? ""} priced ${unitCad} below cost ${cost}`);
      throw new CheckoutError(400, `${product.name_en} isn't available in that option right now.`);
    }

    subtotalCad += unitCad * quantity;
    lines.push({
      product,
      variant,
      quantity,
      unitPrice: toCharge(unitCad),
      salePrice: salePrice != null ? toCharge(salePrice) : null,
      sku: variant?.sku || product.sku || product.id,
      name: variant ? `${product.name_en} — ${variant.name_en}` : product.name_en,
      image: variant?.image_url || product.featured_image_url || null,
    });
  }

  const giftWrapCad = giftWrap ? GIFT_WRAP_FEE_CAD : 0;

  // 2. Shipping.
  let shippingCad: number | null = null;
  if (canQuoteShipping(address)) {
    const threshold = freeShippingThresholdCad();
    if (threshold !== null && subtotalCad >= threshold) {
      shippingCad = 0;
    } else {
      const printifyLines: PrintifyLineItem[] = [];
      let hasLocalItems = false;
      for (const line of lines) {
        if (line.product.printify_product_id && line.variant?.printify_variant_id != null) {
          printifyLines.push({
            product_id: line.product.printify_product_id,
            variant_id: Number(line.variant.printify_variant_id),
            quantity: line.quantity,
          });
        } else {
          hasLocalItems = true;
        }
      }

      shippingCad = hasLocalItems ? localShippingCad() : 0;
      if (printifyLines.length > 0) {
        try {
          const usdCents = await quotePrintifyShipping(printifyLines, {
            first_name: "Quote",
            last_name: "Quote",
            email: "quote@upsidetree.ca",
            country: String(address!.country).toUpperCase(),
            region: address!.province || address!.state || "",
            address1: address!.line1 || "",
            address2: address!.line2 || "",
            city: address!.city || "",
            zip: address!.postal_code || "",
          });
          shippingCad += usdCostToCad((usdCents / 100) * (1 + shippingMarkup()), rates);
        } catch (error) {
          console.error("Shipping quote failed:", error instanceof PrintifyError ? error.body : error);
          throw new CheckoutError(
            502,
            "We couldn't calculate shipping to this address. Check the address, or try again in a moment."
          );
        }
      }
    }
  } else if (requireShipping) {
    throw new CheckoutError(400, "A complete shipping address is required.");
  }

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const giftWrapFee = toCharge(giftWrapCad);
  const shipping = shippingCad === null ? null : toCharge(shippingCad);

  // 3. Canadian sales tax for the destination province (GST/HST, PST), on
  // goods + gift wrap + shipping. Only active rows count; see lib/tax.ts.
  let tax = 0;
  if (shipping !== null && String(address?.country ?? "").toUpperCase() === "CA") {
    const province = normalizeCaProvince(address?.province || address?.state);
    if (!province) {
      if (requireShipping) throw new CheckoutError(400, "Choose a valid Canadian province.");
    } else {
      const { data: taxRows, error: taxError } = await supabase
        .from("tax_rates")
        .select("tax_name, rate, compound")
        .eq("active", true)
        .eq("country", "CA")
        .eq("province", province);
      if (taxError) {
        // Charging without tax that is owed is worse than a failed checkout.
        console.error("Tax rate lookup failed:", taxError);
        throw new CheckoutError(503, "We couldn't calculate tax right now. Please try again in a moment.");
      }
      tax = computeTax(subtotal + giftWrapFee + shipping, (taxRows ?? []) as TaxRateRow[]);
    }
  }

  const total = shipping === null ? null : roundMoney(subtotal + giftWrapFee + shipping + tax);

  return { currency, exchangeRate, lines, subtotal, giftWrapFee, shipping, tax, total };
}
