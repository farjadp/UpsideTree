import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`*, collections(name_en, name_fa)`)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();
    const { variants = [], ...productBody } = body;

    const normalizedStock =
      productBody.product_type === "variable"
        ? (variants as any[]).reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
        : productBody.stock_quantity;

    const productPayload = {
      ...productBody,
      stock_quantity: normalizedStock,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(productPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (Array.isArray(variants) && variants.length > 0) {
      const variantRows = variants.map((variant: any, index: number) => ({
        ...variant,
        product_id: data.id,
        sort_order: variant.sort_order ?? index,
      }));

      const { error: variantsError } = await supabase.from("product_variants").insert(variantRows);

      if (variantsError) {
        await supabase.from("products").delete().eq("id", data.id);
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ product: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
