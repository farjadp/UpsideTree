import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

    const { variants = [], ...productBody } = body;

    const normalizedStock =
      productBody.product_type === "variable"
        ? (variants as any[]).reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
        : productBody.stock_quantity;

    const { error: productError } = await supabase
      .from("products")
      .update({
        ...productBody,
        stock_quantity: normalizedStock,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (Array.isArray(variants) && variants.length > 0) {
      const variantRows = variants.map((variant: any, index: number) => {
        const { id: _variantId, is_active, ...rest } = variant;

        return {
          ...rest,
          product_id: id,
          sort_order: variant.sort_order ?? index,
          stock_status:
            Number(variant.stock_quantity || 0) > 0 ? "in_stock" : "out_of_stock",
        };
      });

      const { error: variantsError } = await supabase.from("product_variants").insert(variantRows);

      if (variantsError) {
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}
