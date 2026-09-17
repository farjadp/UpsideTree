import { createStoredProductAttribute, getStoredProductAttributes } from "@/lib/product-attributes";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const attributes = await getStoredProductAttributes();
  return NextResponse.json({ attributes });
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json();
    const attribute = await createStoredProductAttribute(body);
    return NextResponse.json({ attribute });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
