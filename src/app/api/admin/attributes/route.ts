import { createClient } from "@/utils/supabase/server";
import { createStoredProductAttribute, getStoredProductAttributes } from "@/lib/product-attributes";
import { NextResponse } from "next/server";

export async function GET() {
  const attributes = await getStoredProductAttributes();
  return NextResponse.json({ attributes });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const attribute = await createStoredProductAttribute(body);
    return NextResponse.json({ attribute });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
