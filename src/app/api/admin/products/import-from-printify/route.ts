import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createProductFromPrintify } from "@/lib/printify-catalog";
import { isPrintifyConfigured } from "@/lib/printify";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (!isPrintifyConfigured()) {
    return NextResponse.json(
      { error: "PRINTIFY_API_TOKEN / PRINTIFY_SHOP_ID are not set." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const printifyProductId = String(body.printify_product_id ?? "").trim();

    if (!printifyProductId) {
      return NextResponse.json({ error: "printify_product_id is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await createProductFromPrintify(supabase, printifyProductId);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import product.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
