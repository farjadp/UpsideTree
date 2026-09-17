import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { slugifyProduct } from "@/lib/products";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
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
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { variants = [], ...productBody } = body;

    const normalizedStock =
      productBody.product_type === "variable"
        ? (variants as any[]).reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0)
        : productBody.stock_quantity;

    const safeSlug = slugifyProduct(String(productBody.slug || productBody.name_en || ""));
    const productPayload = {
      ...productBody,
      slug: safeSlug || `product-${Date.now()}`,
      stock_quantity: normalizedStock,
      created_by: guard.userId,
      updated_by: guard.userId,
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
