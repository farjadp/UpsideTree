import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer, formatDate, formatMoney, orderStatusStyle, humanize } from "@/lib/account";
import { ShoppingBag, ChevronRight } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, fulfillment_status, total, currency, created_at, order_items(id)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const list = orders ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#18231F]">My Orders</h2>
        <p className="text-gray-500">Track your orders and download invoices.</p>
      </div>

      <AccountFlash message={message} error={error} />

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#18231F]/15 py-16 text-center">
          <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h3 className="font-serif text-lg text-[#18231F]">No orders yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            When you place an order it will appear here with its status and invoice.
          </p>
          <Link href="/collections" className="mt-6 inline-block">
            <Button className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">Browse collections</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#18231F]/10 overflow-hidden rounded-xl border border-[#18231F]/10">
          {list.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 p-5 transition-colors hover:bg-[#F4EFE3]/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-medium text-[#18231F]">{order.order_number}</span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${orderStatusStyle(order.status)}`}
                  >
                    {humanize(order.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(order.created_at)} · {order.order_items?.length ?? 0} item
                  {(order.order_items?.length ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#18231F]">{formatMoney(order.total, order.currency ?? "CAD")}</p>
                <p className="text-xs text-gray-400">{humanize(order.payment_status)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
