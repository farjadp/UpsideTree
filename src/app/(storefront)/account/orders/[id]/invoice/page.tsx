import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer, formatDate, formatMoney, humanize, type OrderItemRow } from "@/lib/account";
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton";
import { ArrowLeft } from "lucide-react";

function AddressLines({ address }: { address: Record<string, string> | null }) {
  if (!address) return <p className="text-sm text-gray-400">—</p>;

  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" "),
    address.company,
    address.line1 ?? address.address_line_1,
    address.line2 ?? address.address_line_2,
    [address.city, address.province ?? address.province_state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);

  return (
    <address className="text-sm not-italic leading-relaxed text-gray-700">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </address>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireCustomer();

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
  const isPaid = order.payment_status === "paid";

  return (
    <div className="space-y-6">
      {/* Screen-only controls — print:hidden keeps them off the paper copy */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#1D4E89] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order
        </Link>
        <PrintInvoiceButton />
      </div>

      <article className="rounded-xl border border-[#18231F]/10 p-8 print:border-0 print:p-0">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#18231F]/10 pb-6">
          <div>
            <p className="font-serif text-2xl font-bold text-[#18231F]">Upside Tree</p>
            <p className="font-persian text-sm text-gray-500" dir="rtl">
              درخت وارونه
            </p>
            <p className="mt-2 text-xs text-gray-500">upsidetree.ca</p>
          </div>
          <div className="text-right">
            <h1 className="font-serif text-xl font-bold text-[#18231F]">Invoice</h1>
            <p className="mt-1 font-mono text-sm text-gray-600">{order.order_number}</p>
            <p className="text-xs text-gray-500">Issued {formatDate(order.created_at)}</p>
            <p
              className={`mt-2 inline-block rounded border px-2 py-0.5 text-xs font-medium ${
                isPaid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {isPaid ? "PAID" : humanize(order.payment_status).toUpperCase()}
            </p>
          </div>
        </header>

        {/* Parties */}
        <section className="grid grid-cols-1 gap-8 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Billed to</h2>
            <p className="text-sm font-medium text-[#18231F]">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_email}</p>
            {order.customer_phone && <p className="text-sm text-gray-600">{order.customer_phone}</p>}
            <div className="mt-2">
              <AddressLines address={order.billing_address} />
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ship to</h2>
            <AddressLines address={order.shipping_address} />
          </div>
        </section>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-[#18231F]/10 text-left">
              <th className="py-2 font-semibold text-[#18231F]">Item</th>
              <th className="py-2 text-right font-semibold text-[#18231F]">Qty</th>
              <th className="py-2 text-right font-semibold text-[#18231F]">Unit</th>
              <th className="py-2 text-right font-semibold text-[#18231F]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const snapshot = item.product_snapshot ?? {};
              return (
                <tr key={item.id} className="border-b border-[#18231F]/5">
                  <td className="py-3">
                    <div className="font-medium text-[#18231F]">{snapshot.name_en ?? "Product"}</div>
                    <div className="text-xs text-gray-400">SKU {item.sku}</div>
                  </td>
                  <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{formatMoney(item.unit_price, currency)}</td>
                  <td className="py-3 text-right font-medium text-[#18231F]">
                    {formatMoney(item.total_price, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
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
            <div className="flex justify-between border-t border-[#18231F]/15 pt-2 font-serif text-base font-bold text-[#18231F]">
              <dt>Total</dt>
              <dd>{formatMoney(order.total, currency)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-8 border-t border-[#18231F]/10 pt-4 text-xs text-gray-500">
          <p>
            {order.payment_method
              ? `Paid by ${humanize(order.payment_method)}${order.paid_at ? ` on ${formatDate(order.paid_at)}` : ""}.`
              : "Payment pending."}
          </p>
          <p className="mt-1">Thank you for supporting Upside Tree.</p>
        </footer>
      </article>
    </div>
  );
}
