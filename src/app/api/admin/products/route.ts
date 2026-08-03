import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { slugifyProduct, updateProductMetadata } from "@/lib/product-metadata";

function getMissingColumn(error?: { message?: string | null; code?: string | null } | null) {
  const message = error?.message || "";
  if (error?.code !== "PGRST204" && !message.toLowerCase().includes("schema cache")) {
    return null;
  }

  return message.match(/'([^']+)' column/)?.[1] || message.match(/column "([^"]+)"/)?.[1] || null;
}

function stripColumn<T extends Record<string, any> | Record<string, any>[]>(
  payload: T,
  column: string
): T {
  if (Array.isArray(payload)) {
    return payload.map((row) => {
      const { [column]: _removed, ...rest } = row;
      return rest;
    }) as T;
  }

  const { [column]: _removed, ...rest } = payload;
  return rest as T;
}

async function insertWithSchemaFallback(
  table: "products" | "product_variants",
  payload: Record<string, any> | Record<string, any>[],
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: { selectSingle?: boolean } = {}
) {
  let nextPayload = payload;
  const strippedColumns = new Set<string>();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const query = supabase.from(table).insert(nextPayload);
    const result = options.selectSingle ? await query.select().single() : await query;

    if (!result.error) {
      return { ...result, strippedColumns };
    }

    const missingColumn = getMissingColumn(result.error);
    if (!missingColumn || strippedColumns.has(missingColumn)) {
      return { ...result, strippedColumns };
    }

    strippedColumns.add(missingColumn);
    nextPayload = stripColumn(nextPayload, missingColumn);
  }

  return {
    data: null,
    error: { message: "Product save stopped after removing too many unsupported database columns." },
    strippedColumns,
  };
}

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

    const safeSlug = slugifyProduct(String(productBody.slug || productBody.name_en || ""));
    const productPayload = {
      ...productBody,
      slug: safeSlug || `product-${Date.now()}`,
      stock_quantity: normalizedStock,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    const { data, error } = await insertWithSchemaFallback("products", productPayload, supabase, {
      selectSingle: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await updateProductMetadata(String(data.id), productPayload);

    if (Array.isArray(variants) && variants.length > 0) {
      const variantRows = variants.map((variant: any, index: number) => ({
        ...variant,
        product_id: data.id,
        sort_order: variant.sort_order ?? index,
      }));

      const { error: variantsError } = await insertWithSchemaFallback(
        "product_variants",
        variantRows,
        supabase,
      );

      if (variantsError) {
        await supabase.from("products").delete().eq("id", data.id);
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ product: { ...data, ...productPayload } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
