import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, Gift, TreePine, Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatDate, formatMoney, humanize } from "@/lib/account";

type CustomerOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  total: number | string;
  currency: string | null;
};

export default async function SingleCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customer_profiles")
    .select("id, email, first_name, last_name, phone, role, account_status, created_at, last_login_at")
    .eq("id", id)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const [{ data: orderRows }, { data: loyalty }, { data: address }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, created_at, status, payment_status, fulfillment_status, total, currency")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_accounts")
      .select("tier, current_balance, total_points_earned")
      .eq("customer_id", id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("city, province_state, country")
      .eq("customer_id", id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orders = (orderRows ?? []) as CustomerOrder[];
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
  const location = address
    ? [address.city, address.province_state, address.country].filter(Boolean).join(", ")
    : null;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/customers"
            className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-semibold text-white tracking-tight">{name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {humanize(customer.role)} · joined {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/customers/${customer.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white text-sm border border-white/10"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl bg-slate-900/50 border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Customer details</h2>
          <div className="flex items-center text-slate-300">
            <Mail className="w-4 h-4 mr-3 text-slate-500" />
            {customer.email}
          </div>
          {customer.phone && (
            <div className="flex items-center text-slate-300">
              <Phone className="w-4 h-4 mr-3 text-slate-500" />
              {customer.phone}
            </div>
          )}
          <div className="flex items-center text-slate-300">
            <MapPin className="w-4 h-4 mr-3 text-slate-500" />
            {location ?? <span className="text-slate-500">No saved address</span>}
          </div>
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total spent</p>
              <p className="text-xl font-bold text-white">{formatMoney(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Paid orders</p>
              <p className="text-xl font-bold text-white">{paidOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-6">
          <h2 className="flex items-center text-lg font-semibold text-white">
            <Gift className="w-5 h-5 mr-2 text-gold-400" />
            Loyalty
          </h2>
          {loyalty ? (
            <div className="mt-4 space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lapis-600 text-white text-sm font-medium">
                <TreePine className="w-4 h-4" />
                {loyalty.tier ?? "Seed"}
              </span>
              <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                <span className="text-slate-400">Current balance</span>
                <span className="font-bold text-white">{loyalty.current_balance} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Earned (lifetime)</span>
                <span className="text-slate-200">{loyalty.total_points_earned} pts</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No loyalty account.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/50 border border-white/10 overflow-hidden">
        <h2 className="px-6 pt-6 pb-4 text-lg font-semibold text-white">Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs tracking-wider border-y border-white/10">
              <tr>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Fulfillment</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-6 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-lapis-300 hover:underline">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-400">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-3">{humanize(order.status)}</td>
                    <td className="px-6 py-3">{humanize(order.fulfillment_status)}</td>
                    <td className="px-6 py-3 text-right text-white">{formatMoney(order.total, order.currency ?? "CAD")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
