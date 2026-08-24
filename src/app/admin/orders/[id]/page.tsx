import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintifyFulfillmentCard } from "@/components/admin/PrintifyFulfillmentCard";
import { formatMoney, formatDateTime, humanize, type OrderItemRow } from "@/lib/account";
import { ArrowLeft, Truck, User } from "lucide-react";

function AddressBlock({ address }: { address: Record<string, string> | null }) {
  if (!address) return <p className="text-sm text-gray-400">—</p>;

  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.company,
    address.line1 ?? address.address_line_1,
    address.line2 ?? address.address_line_2,
    [address.city, address.province ?? address.province_state, address.postal_code].filter(Boolean).join(", "),
    address.country,
    address.phone,
  ].filter(Boolean);

  return (
    <address className="text-sm not-italic leading-relaxed text-gray-600">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </address>
  );
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const items: OrderItemRow[] = order.order_items ?? [];
  const currency = order.currency ?? "CAD";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">{order.order_number}</h1>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {humanize(order.status)}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-slate-300">
                {humanize(order.payment_status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">Placed {formatDateTime(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const snapshot = item.product_snapshot ?? {};
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{snapshot.name_en ?? "Product"}</p>
                      <p className="text-xs text-gray-500">
                        SKU {item.sku} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">{formatMoney(item.total_price, currency)}</p>
                  </div>
                );
              })}

              <dl className="space-y-1.5 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd>{formatMoney(order.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Shipping</dt>
                  <dd>{formatMoney(order.shipping_cost, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax</dt>
                  <dd>{formatMoney(order.tax_amount, currency)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total, currency)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Shipping address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AddressBlock address={order.shipping_address} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Billing address</CardTitle>
              </CardHeader>
              <CardContent>
                <AddressBlock address={order.billing_address} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{order.customer_name}</p>
              <p className="text-gray-600">{order.customer_email}</p>
              {order.customer_phone && <p className="text-gray-600">{order.customer_phone}</p>}
              {!order.customer_id && <p className="pt-1 text-xs text-gray-400">Guest checkout</p>}
            </CardContent>
          </Card>

          <PrintifyFulfillmentCard
            orderId={order.id}
            printifyOrderId={order.printify_order_id}
            fulfillmentStatus={order.fulfillment_status}
            fulfillmentError={order.fulfillment_error}
            fulfillmentAttempts={order.fulfillment_attempts}
            paymentStatus={order.payment_status}
          />
        </div>
      </div>
    </div>
  );
}
