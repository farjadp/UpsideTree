import Link from "next/link";
import { DollarSign, ShoppingBag, Package, Users, Receipt, ShieldAlert, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatPrice } from "@/lib/utils";
import { formatDateTime, humanize } from "@/lib/account";
import { RevenueChart, OrderStatusChart, type StatusSlice } from "@/components/admin/DashboardCharts";

const MONTHS_SHOWN = 6;

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#eab308",
  processing: "#3b82f6",
  completed: "#10b981",
  payment_failed: "#ef4444",
  cancelled: "#64748b",
  refunded: "#8b5cf6",
  partially_refunded: "#a78bfa",
  on_hold: "#94a3b8",
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

// Month-over-month change; null when last month had nothing to compare to.
function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Totals are summed in JS: PostgREST aggregates are off by default and
  // the order volume is small. Swap for an RPC when orders reach the
  // tens of thousands.
  const [orders, products, customers, recentOrders, alerts] = await Promise.all([
    supabase.from("orders").select("status, payment_status, total, paid_at, created_at"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customer_profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER"),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("system_event_logs")
      .select("id, created_at, service, event_type, severity, error_message")
      .in("severity", ["error", "critical"])
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const orderRows = (orders.data ?? []) as Array<{
    status: string | null;
    payment_status: string | null;
    total: number | string;
    paid_at: string | null;
    created_at: string;
  }>;
  const paid = orderRows.filter((o) => o.payment_status === "paid");

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const revenueByMonth = new Map<string, number>();
  const ordersByMonth = new Map<string, number>();
  for (const order of paid) {
    const key = monthKey(new Date(order.paid_at ?? order.created_at));
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(order.total ?? 0));
    ordersByMonth.set(key, (ordersByMonth.get(key) ?? 0) + 1);
  }

  const revenueData = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
    return {
      name: date.toLocaleString("en-CA", { month: "short" }),
      total: Math.round((revenueByMonth.get(monthKey(date)) ?? 0) * 100) / 100,
    };
  });

  const statusCounts = new Map<string, number>();
  for (const order of orderRows) {
    const status = order.status ?? "unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const statusData: StatusSlice[] = Array.from(statusCounts, ([status, value]) => ({
    name: humanize(status),
    value,
    color: STATUS_COLORS[status] ?? "#64748b",
  }));

  const kpis = [
    {
      title: "Revenue (paid)",
      value: formatPrice(paid.reduce((sum, o) => sum + Number(o.total ?? 0), 0)),
      change: percentChange(revenueByMonth.get(thisMonth) ?? 0, revenueByMonth.get(lastMonth) ?? 0),
      icon: DollarSign,
      color: "from-emerald-500/20 to-emerald-500/0",
      textColor: "text-emerald-500",
    },
    {
      title: "Paid Orders",
      value: paid.length.toLocaleString(),
      change: percentChange(ordersByMonth.get(thisMonth) ?? 0, ordersByMonth.get(lastMonth) ?? 0),
      icon: ShoppingBag,
      color: "from-blue-500/20 to-blue-500/0",
      textColor: "text-blue-500",
    },
    {
      title: "Active Products",
      value: (products.count ?? 0).toLocaleString(),
      change: null,
      icon: Package,
      color: "from-pomegranate-500/20 to-pomegranate-500/0",
      textColor: "text-pomegranate-500",
    },
    {
      title: "Customers",
      value: (customers.count ?? 0).toLocaleString(),
      change: null,
      icon: Users,
      color: "from-gold-500/20 to-gold-500/0",
      textColor: "text-gold-400",
    },
  ];

  const alertRows = alerts.data ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Live figures from orders, products and system logs.</p>
      </div>

      {orders.error && (
        <p className="rounded-xl border border-pomegranate-500/30 bg-pomegranate-500/10 p-4 text-sm text-pomegranate-300">
          Couldn&apos;t load orders: {orders.error.message}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="relative overflow-hidden rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 shadow-lg">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${kpi.color} rounded-bl-full -mr-16 -mt-16`} />
            <div className="flex items-center justify-between relative z-10">
              <p className="text-sm font-medium text-slate-400">{kpi.title}</p>
              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 shadow-inner">
                <kpi.icon className={`h-4 w-4 ${kpi.textColor}`} />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <h3 className="text-3xl font-bold text-white tracking-tight">{kpi.value}</h3>
              {kpi.change !== null && (
                <div className="flex items-center mt-2">
                  <span className={`flex items-center text-xs font-medium ${kpi.change >= 0 ? "text-emerald-400" : "text-pomegranate-400"}`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {Math.abs(kpi.change)}%
                  </span>
                  <span className="text-xs text-slate-500 ml-2">this month vs last</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue</h3>
            <p className="text-sm text-slate-400">Paid orders, last {MONTHS_SHOWN} months</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <RevenueChart data={revenueData} />
          </div>
        </div>

        <div className="col-span-3 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Order Status</h3>
            <p className="text-sm text-slate-400">All orders by current status</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px] text-sm text-slate-500">No orders yet.</div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
              <OrderStatusChart data={statusData} />
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-6 text-sm text-slate-300 w-full">
                {statusData.map((status) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" aria-hidden>
                      <circle cx="5" cy="5" r="5" fill={status.color} />
                    </svg>
                    {status.name}
                    <span className="font-semibold text-white ml-1">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
            <Link href="/admin/orders" className="ml-auto text-xs font-semibold text-slate-400 hover:text-white">All orders →</Link>
          </div>
          {(recentOrders.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {(recentOrders.data ?? []).map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5 hover:border-white/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">#{order.order_number} · {order.customer_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.created_at)} · {humanize(order.status)}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatPrice(Number(order.total ?? 0))}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-pomegranate-500/10 border border-pomegranate-500/20">
              <ShieldAlert className="w-5 h-5 text-pomegranate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Unresolved Errors</h3>
            <Link href="/admin/logs" className="ml-auto text-xs font-semibold text-slate-400 hover:text-white">Logs →</Link>
          </div>
          {alertRows.length === 0 ? (
            <p className="text-sm text-slate-500">No unresolved errors.</p>
          ) : (
            <div className="space-y-3">
              {alertRows.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-400 font-mono mt-0.5 whitespace-nowrap">{formatDateTime(alert.created_at)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{alert.service}: {alert.event_type}</p>
                    {alert.error_message && <p className="text-xs text-slate-400 mt-1 truncate">{alert.error_message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
