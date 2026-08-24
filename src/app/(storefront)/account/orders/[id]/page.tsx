import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AccountFlash } from "@/components/account/AccountFlash";
import {
  requireCustomer,
  formatDate,
  formatDateTime,
  formatMoney,
  orderStatusStyle,
  humanize,
  type OrderItemRow,
} from "@/lib/account";
import { ArrowLeft, Truck, LifeBuoy, Printer } from "lucide-react";

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

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { id } = await params;
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  // The .eq("customer_id") is belt-and-braces on top of RLS — without it a
  // missing policy would turn into someone else's order rendering rather
  // than a 404.
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const items: OrderItemRow[] = order.order_items ?? [];
  const currency = order.currency ?? "CAD";

  const timeline = [
    { label: "Order placed", at: order.created_at },
    { label: "Payment received", at: order.paid_at },
    { label: "Shipped", at: order.shipped_at },
    { label: "Delivered", at: order.delivered_at },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#1D4E89] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All orders
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#18231F]">Order {order.order_number}</h2>
          <p className="text-gray-500">Placed {formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${orderStatusStyle(order.status)}`}
          >
            {humanize(order.status)}
          </span>
          <Link href={`/account/orders/${order.id}/invoice`}>
            <Button variant="outline" className="gap-2 border-[#18231F]/20 text-[#18231F] hover:bg-[#F4EFE3]">
              <Printer className="h-4 w-4" />
              Invoice
            </Button>
          </Link>
        </div>
      </div>

      <AccountFlash message={message} error={error} />

      {/* Timeline */}
      <div className="rounded-xl border border-[#18231F]/10 p-5">
        <h3 className="mb-4 font-medium text-[#18231F]">Progress</h3>
        <ol className="space-y-3">
          {timeline.map((step) => (
            <li key={step.label} className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${step.at ? "bg-emerald-500" : "bg-gray-200"}`}
                aria-hidden="true"
              />
              <span className={step.at ? "font-medium text-[#18231F]" : "text-gray-400"}>{step.label}</span>
              <span className="ml-auto text-xs text-gray-400">{step.at ? formatDateTime(step.at) : "Pending"}</span>
            </li>
          ))}
        </ol>

        {order.tracking_number && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-[#F4EFE3]/60 p-4 text-sm">
            <Truck className="h-4 w-4 text-[#1D4E89]" />
            <span className="text-gray-600">
              {order.tracking_carrier ? `${order.tracking_carrier} · ` : ""}
              <span className="font-mono">{order.tracking_number}</span>
            </span>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[#1D4E89] hover:underline"
              >
                Track parcel
              </a>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="overflow-hidden rounded-xl border border-[#18231F]/10">
        <div className="divide-y divide-[#18231F]/10">
          {items.map((item) => {
            const snapshot = item.product_snapshot ?? {};
            return (
              <div key={item.id} className="flex items-start gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#18231F]">{snapshot.name_en ?? "Product"}</p>
                  {snapshot.name_fa && (
                    <p className="font-persian text-sm text-gray-400" dir="rtl">
                      {snapshot.name_fa}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    SKU {item.sku} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-right font-medium text-[#18231F]">
                  {formatMoney(item.total_price, currency)}
                </p>
              </div>
            );
          })}
        </div>

        <dl className="space-y-2 border-t border-[#18231F]/10 bg-[#F4EFE3]/30 p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Subtotal</dt>
            <dd>{formatMoney(order.subtotal, currency)}</dd>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd>−{formatMoney(order.discount_amount, currency)}</dd>
            </div>
          )}
          {Number(order.gift_wrap_fee) > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Gift wrapping</dt>
              <dd>{formatMoney(order.gift_wrap_fee, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600">Shipping</dt>
            <dd>{Number(order.shipping_cost) === 0 ? "Free" : formatMoney(order.shipping_cost, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Tax</dt>
            <dd>{formatMoney(order.tax_amount, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#18231F]/10 pt-3 font-serif text-lg font-bold text-[#18231F]">
            <dt>Total</dt>
            <dd>{formatMoney(order.total, currency)}</dd>
          </div>
        </dl>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#18231F]/10 p-5">
          <h3 className="mb-3 font-medium text-[#18231F]">Shipping address</h3>
          <AddressBlock address={order.shipping_address} />
        </div>
        <div className="rounded-xl border border-[#18231F]/10 p-5">
          <h3 className="mb-3 font-medium text-[#18231F]">Billing address</h3>
          <AddressBlock address={order.billing_address} />
        </div>
      </div>

      {(order.gift_message || order.order_notes) && (
        <div className="space-y-3 rounded-xl border border-[#18231F]/10 p-5 text-sm">
          {order.gift_message && (
            <div>
              <p className="font-medium text-[#18231F]">Gift message</p>
              <p className="text-gray-600">{order.gift_message}</p>
            </div>
          )}
          {order.order_notes && (
            <div>
              <p className="font-medium text-[#18231F]">Order notes</p>
              <p className="text-gray-600">{order.order_notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Link href={`/account/support/new?order=${order.id}`}>
          <Button variant="outline" className="gap-2 border-[#18231F]/20 text-[#18231F] hover:bg-[#F4EFE3]">
            <LifeBuoy className="h-4 w-4" />
            Get help with this order
          </Button>
        </Link>
      </div>
    </div>
  );
}
