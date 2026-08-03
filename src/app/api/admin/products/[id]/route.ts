import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

async function updateWithSchemaFallback(
  table: "products",
  payload: Record<string, any>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  let nextPayload = payload;
  const strippedColumns = new Set<string>();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from(table).update(nextPayload).eq("id", id);

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
    error: { message: "Too many schema fallback attempts while updating product." },
    strippedColumns,
  };
}

async function insertWithSchemaFallback(
  table: "product_variants",
  payload: Record<string, any>[],
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  let nextPayload = payload;
  const strippedColumns = new Set<string>();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from(table).insert(nextPayload);

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
    error: { message: "Too many schema fallback attempts while saving variants." },
    strippedColumns,
  };
}

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

    const { error: productError } = await updateWithSchemaFallback(
      "products",
      {
        ...productBody,
        stock_quantity: normalizedStock,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      supabase,
      id,
    );

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

      const { error: variantsError } = await insertWithSchemaFallback(
        "product_variants",
        variantRows,
        supabase,
      );

      if (variantsError) {
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update product" }, { status: 500 });
  }
}
