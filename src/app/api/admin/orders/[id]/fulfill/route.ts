import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fulfillOrder } from "@/lib/fulfillment";

// Manual retry for an order that was paid but didn't reach Printify —
// usually because the product wasn't linked yet, or Printify was down.
// fulfillOrder() is idempotent, so pressing this twice is harmless.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const result = await fulfillOrder(id, "admin");

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, status: result.status, retryable: result.retryable },
      { status: result.status === "skipped" ? 409 : 502 }
    );
  }

  return NextResponse.json({
    status: result.status,
    printify_order_id: result.printifyOrderId,
  });
}
