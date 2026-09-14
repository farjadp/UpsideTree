import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { slugifyProduct } from "@/lib/products";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variants = [], variant_prices: variantPrices = [], ...productBody } = body;

    const normalizedStock =
      productBody.product_type === "variable"
        ? (variants as any[]).reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
        : productBody.stock_quantity;

    const safeSlug = slugifyProduct(String(productBody.slug || productBody.name_en || ""));
    const productPayload = {
      ...productBody,
      slug: safeSlug || `product-${Date.now()}`,
      stock_quantity: normalizedStock,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error: productError } = await supabase
      .from("products")
      .update(productPayload)
      .eq("id", id);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    // Variants are reconciled by id, never delete-and-reinsert: wiping them
    // dropped each row's printify_variant_id (so Printify products could no
    // longer be fulfilled), changed ids under live carts, and nulled
    // order_items.variant_id on past orders.
    const { data: product } = await supabase
      .from("products")
      .select("printify_product_id")
      .eq("id", id)
      .single();

    // Manual per-size prices from the margin panel (auto pricing off). Only
    // the price changes; Printify still owns which variants exist.
    if (Array.isArray(variantPrices) && variantPrices.length > 0) {
      for (const entry of variantPrices as Array<{ id?: unknown; price?: unknown }>) {
        const price = Number(entry.price);
        if (typeof entry.id !== "string" || !(price > 0)) continue;
        const { error } = await supabase
          .from("product_variants")
          .update({ price: Math.round(price * 100) / 100 })
          .eq("id", entry.id)
          .eq("product_id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Listings show the product price ("from"): keep it the cheapest size.
      const { data: priced } = await supabase.from("product_variants").select("price").eq("product_id", id).not("price", "is", null);
      const prices = (priced ?? []).map((row) => Number(row.price)).filter((value) => value > 0);
      if (prices.length > 0) {
        await supabase.from("products").update({ price: Math.min(...prices) }).eq("id", id);
      }
    }

    // Printify owns which variants a linked product has (the catalog sync
    // mirrors them), and the editor doesn't show variants for print-on-
    // demand products — an empty list here means "not edited", not
    // "delete them all".
    if (product?.printify_product_id || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", id);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingIds = new Set((existingRows ?? []).map((row) => row.id as string));
    const keptIds = new Set<string>();

    type VariantInput = { id?: string; is_active?: boolean; sort_order?: number; stock_quantity?: number } & Record<string, unknown>;
    for (const [index, variant] of (variants as VariantInput[]).entries()) {
      // is_active is editor-only state, not a product_variants column.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: variantId, is_active, ...rest } = variant;
      const row = {
        ...rest,
        product_id: id,
        sort_order: variant.sort_order ?? index,
        stock_status: Number(variant.stock_quantity || 0) > 0 ? "in_stock" : "out_of_stock",
      };

      if (variantId && existingIds.has(variantId)) {
        keptIds.add(variantId);
        const { error } = await supabase.from("product_variants").update(row).eq("id", variantId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase.from("product_variants").insert(row);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const removedIds = [...existingIds].filter((variantId) => !keptIds.has(variantId));
    if (removedIds.length > 0) {
      const { error } = await supabase.from("product_variants").delete().in("id", removedIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}
