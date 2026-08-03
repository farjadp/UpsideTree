import { createClient } from "@/utils/supabase/server";
import { createStoredProductAttribute, getStoredProductAttributes } from "@/lib/product-attribute-metadata";
import { NextResponse } from "next/server";

function isMissingProductAttributesTable(error?: { message?: string | null; code?: string | null } | null) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "PGRST205" ||
    message.includes("product_attributes") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation \"product_attributes\" does not exist")
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attributes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error && isMissingProductAttributesTable(error)) {
    const attributes = await getStoredProductAttributes();
    return NextResponse.json({ attributes });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attributes: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("product_attributes")
      .insert(body)
      .select()
      .single();

    if (error && isMissingProductAttributesTable(error)) {
      const attribute = await createStoredProductAttribute(body);
      return NextResponse.json({ attribute });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attribute: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
