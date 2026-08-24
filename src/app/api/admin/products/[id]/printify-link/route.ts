import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { linkProductToPrintify, unlinkProductFromPrintify } from "@/lib/printify-catalog";
import { isPrintifyConfigured } from "@/lib/printify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

    // The admin's own client is used for the writes so they run under the
    // caller's RLS ("Admins have full access to products"), rather than
    // escalating to the service role for something a normal admin session
    // is already allowed to do.
    const supabase = await createClient();
    const result = await linkProductToPrintify(supabase, id, printifyProductId);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to link product.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const supabase = await createClient();
    await unlinkProductFromPrintify(supabase, id);
    return NextResponse.json({ unlinked: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unlink product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
