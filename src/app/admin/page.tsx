import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  Receipt,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  PackageX,
  Share2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatPrice } from "@/lib/utils";
import { formatDateTime, humanize, oneRelation } from "@/lib/account";
import { RevenueChart, OrderStatusChart, type StatusSlice } from "@/components/admin/DashboardCharts";
import { Panel, QueryErrorNote, EmptyState } from "@/components/admin/dashboard/Panel";

const MONTHS_SHOWN = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
// Row caps keep the dashboard fast. PostgREST also enforces its own max-rows,
// so totals built from these rows are flagged when the cap is reached.
const ORDER_ROW_CAP = 5000;
const ORDER_ITEM_ROW_CAP = 5000;
const STOCK_ROW_CAP = 1000;

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

type OrderRow = {
  status: string | null;
  payment_status: string | null;
  total: number | string | null;
  exchange_rate: number | string | null;
  paid_at: string | null;
  created_at: string;
};

type OrderItemRow = {
  product_id: string | null;
  quantity: number | null;
  total_price: number | string | null;
  product_snapshot: { name_en?: string | null } | null;
  orders: unknown;
};

type StockRow = {
  id: string;
  name_en: string;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

// Orders are stored in the currency charged; exchange_rate is CAD → that
// currency, so dividing reports every amount in CAD.
function toCad(amount: number | string | null, exchangeRate: number | string | null) {
  return Number(amount ?? 0) / (Number(exchangeRate) || 1);
}

// Change vs the previous period; null when there is nothing to compare to.
function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS).toISOString();

  // Totals are summed in JS: PostgREST aggregates are off by default and
  // the order volume is small. Swap for an RPC when orders reach the
  // tens of thousands.
  const [
    orders,
    products,
    customers,
    newCustomers,
    recentOrders,
    alerts,
    orderItems,
    unsynced,
    stockTracked,
    socialPosted,
    socialFailed,
    recentSocial,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("status, payment_status, total, exchange_rate, paid_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(ORDER_ROW_CAP),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customer_profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER"),
    supabase
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "CUSTOMER")
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("system_event_logs")
      .select("id, created_at, service, event_type, severity, error_message", { count: "exact" })
      .in("severity", ["error", "critical"])
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("order_items")
      .select("product_id, quantity, total_price, product_snapshot, orders!inner(payment_status, exchange_rate)")
      .eq("orders.payment_status", "paid")
      .limit(ORDER_ITEM_ROW_CAP),
    // Printify products that need a sync or a link: out of sync (removed on
    // Printify) or print-on-demand with no Printify product behind them.
    supabase
      .from("products")
      .select("id, name_en, status, printify_sync_status, printify_product_id", { count: "exact" })
      .neq("status", "archived")
      .or("printify_sync_status.eq.out_of_sync,and(product_type.eq.pod,printify_product_id.is.null)")
      .order("updated_at", { ascending: false })
      .limit(5),
    // Only products that track stock; print-on-demand is always available.
    supabase
      .from("products")
      .select("id, name_en, stock_quantity, low_stock_threshold")
      .eq("status", "active")
      .eq("manage_stock", true)
      .order("stock_quantity", { ascending: true })
      .limit(STOCK_ROW_CAP),
    supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "posted")
      .gte("posted_at", thirtyDaysAgo),
    supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", thirtyDaysAgo),
    supabase
      .from("social_posts")
      .select("id, platform, status, external_url, error, posted_at, updated_at, products(name_en)")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  // ---- Orders: revenue, trends, status -------------------------------------
  const orderRows = (orders.data ?? []) as OrderRow[];
  const ordersTruncated = (orders.count ?? 0) > orderRows.length;
  const paid = orderRows.filter((o) => o.payment_status === "paid");

  // Month-to-date vs the same span of last month, so early in a month the
  // arrow isn't comparing a few days against a whole month.
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthSameSpanEnd = Math.min(lastMonthStart + (now.getTime() - thisMonthStart), thisMonthStart);

  const revenueByMonth = new Map<string, number>();
  let mtdRevenue = 0;
  let mtdOrders = 0;
  let prevRevenue = 0;
  let prevOrders = 0;
  for (const order of paid) {
    const paidAt = new Date(order.paid_at ?? order.created_at);
    const cad = toCad(order.total, order.exchange_rate);
    const key = monthKey(paidAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + cad);

    const t = paidAt.getTime();
    if (t >= thisMonthStart) {
      mtdRevenue += cad;
      mtdOrders += 1;
    } else if (t >= lastMonthStart && t < lastMonthSameSpanEnd) {
      prevRevenue += cad;
      prevOrders += 1;
    }
  }

  const revenueData = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
    return {
      name: date.toLocaleString("en-CA", { month: "short" }),
      total: Math.round((revenueByMonth.get(monthKey(date)) ?? 0) * 100) / 100,
    };
  });
  const hasRevenueInWindow = revenueData.some((point) => point.total > 0);

  const statusCounts = new Map<string, number>();
  for (const order of orderRows) {
    const status = order.status ?? "unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const statusData: StatusSlice[] = Array.from(statusCounts, ([status, value]) => ({
    name: humanize(status),
    value,
    color: STATUS_COLORS[status] ?? "#64748b",
  })).sort((a, b) => b.value - a.value);

  // ---- Top products by units sold (paid orders) ----------------------------
  const itemRows = (orderItems.data ?? []) as OrderItemRow[];
  const itemsTruncated = itemRows.length >= ORDER_ITEM_ROW_CAP;
  const productTotals = new Map<string, { id: string | null; name: string; units: number; revenue: number }>();
  for (const item of itemRows) {
    const order = oneRelation<{ exchange_rate: number | string | null }>(item.orders);
    const name = item.product_snapshot?.name_en || "Unnamed product";
    const key = item.product_id ?? `deleted:${name}`;
    const entry = productTotals.get(key) ?? { id: item.product_id, name, units: 0, revenue: 0 };
    entry.units += Number(item.quantity ?? 0);
    entry.revenue += toCad(item.total_price, order?.exchange_rate ?? null);
    productTotals.set(key, entry);
  }
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5);

  // ---- Stock & Printify ----------------------------------------------------
  // PostgREST can't compare two columns, so low stock is filtered here.
  const lowStock = ((stockTracked.data ?? []) as StockRow[])
    .filter((p) => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5))
    .slice(0, 5);
  const unsyncedRows = (unsynced.data ?? []) as Array<{
    id: string;
    name_en: string;
    status: string | null;
    printify_sync_status: string | null;
    printify_product_id: string | null;
  }>;

  // ---- Social --------------------------------------------------------------
  const socialRows = (recentSocial.data ?? []) as Array<{
    id: string;
    platform: string;
    status: string;
    external_url: string | null;
    error: string | null;
    posted_at: string | null;
    updated_at: string;
    products: unknown;
  }>;
  const socialError = socialPosted.error ?? socialFailed.error ?? recentSocial.error;

  const kpis = [
    {
      title: "Revenue (paid)",
      value: orders.error ? "—" : formatPrice(paid.reduce((sum, o) => sum + toCad(o.total, o.exchange_rate), 0)),
      footnote: ordersTruncated ? `Latest ${orderRows.length.toLocaleString()} orders only` : "All time, in CAD",
      change: orders.error ? null : percentChange(mtdRevenue, prevRevenue),
      icon: DollarSign,
      color: "from-emerald-500/20 to-emerald-500/0",
      textColor: "text-emerald-500",
    },
    {
      title: "Paid Orders",
      value: orders.error ? "—" : paid.length.toLocaleString(),
      footnote: `${mtdOrders.toLocaleString()} this month`,
      change: orders.error ? null : percentChange(mtdOrders, prevOrders),
      icon: ShoppingBag,
      color: "from-blue-500/20 to-blue-500/0",
      textColor: "text-blue-500",
    },
    {
      title: "Active Products",
      value: products.error ? "—" : (products.count ?? 0).toLocaleString(),
      footnote: products.error ? "Couldn't load" : "Live on the storefront",
      change: null,
      icon: Package,
      color: "from-pomegranate-500/20 to-pomegranate-500/0",
      textColor: "text-pomegranate-500",
    },
    {
      title: "Customers",
      value: customers.error ? "—" : (customers.count ?? 0).toLocaleString(),
      footnote: newCustomers.error
        ? "Couldn't load new sign-ups"
        : `${(newCustomers.count ?? 0).toLocaleString()} new in the last 30 days`,
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
        <p className="text-sm text-slate-400 mt-1">Live figures from orders, products, customers and system logs.</p>
      </div>

      {orders.error && <QueryErrorNote what="orders" message={orders.error.message} />}

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
              {kpi.change !== null ? (
                <div className="flex items-center mt-2">
                  <span className={`flex items-center text-xs font-medium ${kpi.change >= 0 ? "text-emerald-400" : "text-pomegranate-400"}`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {Math.abs(kpi.change)}%
                  </span>
                  <span className="text-xs text-slate-500 ml-2">month to date vs same days last month</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">{kpi.footnote}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Panel title="Revenue" subtitle={`Paid orders in CAD, last ${MONTHS_SHOWN} months`} className="lg:col-span-4">
          {orders.error ? (
            <QueryErrorNote what="revenue" message={orders.error.message} />
          ) : !hasRevenueInWindow ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px] text-sm text-slate-500">
              No paid orders in the last {MONTHS_SHOWN} months.
            </div>
          ) : (
            <div className="flex-1 min-h-[300px]">
              <RevenueChart data={revenueData} />
            </div>
          )}
        </Panel>

        <Panel
          title="Order Status"
          subtitle={ordersTruncated ? `Latest ${orderRows.length.toLocaleString()} orders by status` : "All orders by current status"}
          className="lg:col-span-3"
        >
          {orders.error ? (
            <QueryErrorNote what="order statuses" message={orders.error.message} />
          ) : statusData.length === 0 ? (
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
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Recent Orders" icon={Receipt} tone="blue" href="/admin/orders" linkLabel="All orders">
          {recentOrders.error ? (
            <QueryErrorNote what="recent orders" message={recentOrders.error.message} />
          ) : (recentOrders.data ?? []).length === 0 ? (
            <EmptyState>No orders yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {(recentOrders.data ?? []).map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5 hover:border-white/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">#{order.order_number} · {order.customer_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.created_at)} · {humanize(order.status)}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatPrice(Number(order.total ?? 0), order.currency ?? "CAD")}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Top Products"
          subtitle={itemsTruncated ? `Units sold, first ${ORDER_ITEM_ROW_CAP.toLocaleString()} paid line items` : "Units sold across paid orders"}
          icon={Trophy}
          tone="gold"
        >
          {orderItems.error ? (
            <QueryErrorNote what="top products" message={orderItems.error.message} />
          ) : topProducts.length === 0 ? (
            <EmptyState>No paid orders yet.</EmptyState>
          ) : (
            <ol className="space-y-3">
              {topProducts.map((product, index) => {
                const body = (
                  <>
                    <span className="w-5 text-xs font-mono text-slate-500">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatPrice(Math.round(product.revenue * 100) / 100)} revenue</p>
                    </div>
                    <span className="text-sm font-semibold text-white whitespace-nowrap">{product.units.toLocaleString()} sold</span>
                  </>
                );
                const rowClass = "flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5";
                return (
                  <li key={product.id ?? product.name}>
                    {product.id ? (
                      <Link href={`/admin/products/${product.id}`} className={`${rowClass} hover:border-white/20`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Products Needing Attention" icon={PackageX} tone="turquoise" href="/admin/products" linkLabel="Products">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Printify: unsynced or unlinked{unsynced.count ? ` (${unsynced.count})` : ""}
              </p>
              {unsynced.error ? (
                <QueryErrorNote what="Printify status" message={unsynced.error.message} />
              ) : unsyncedRows.length === 0 ? (
                <EmptyState>All print-on-demand products are linked and in sync.</EmptyState>
              ) : (
                <div className="space-y-2">
                  {unsyncedRows.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5 hover:border-white/20"
                    >
                      <p className="flex-1 min-w-0 text-sm text-slate-200 truncate">{product.name_en}</p>
                      <span className="text-xs text-gold-400 whitespace-nowrap">
                        {product.printify_sync_status === "out_of_sync" ? "Out of sync" : "Not linked"} · {humanize(product.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Low stock (tracked products)</p>
              {stockTracked.error ? (
                <QueryErrorNote what="stock levels" message={stockTracked.error.message} />
              ) : lowStock.length === 0 ? (
                <EmptyState>No active stock-tracked products are low.</EmptyState>
              ) : (
                <div className="space-y-2">
                  {lowStock.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5 hover:border-white/20"
                    >
                      <p className="flex-1 min-w-0 text-sm text-slate-200 truncate">{product.name_en}</p>
                      <span className={`text-xs whitespace-nowrap ${(product.stock_quantity ?? 0) <= 0 ? "text-pomegranate-400" : "text-gold-400"}`}>
                        {product.stock_quantity ?? 0} left
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Unresolved Errors" icon={ShieldAlert} tone="pomegranate" href="/admin/logs" linkLabel="Logs">
          {alerts.error ? (
            <QueryErrorNote what="error logs" message={alerts.error.message} />
          ) : alertRows.length === 0 ? (
            <EmptyState>No unresolved errors.</EmptyState>
          ) : (
            <div className="space-y-3">
              {(alerts.count ?? 0) > alertRows.length && (
                <p className="text-xs text-slate-400">
                  Showing the latest {alertRows.length} of {(alerts.count ?? 0).toLocaleString()} unresolved.
                </p>
              )}
              {alertRows.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-400 font-mono mt-0.5 whitespace-nowrap">{formatDateTime(alert.created_at)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {alert.service}: {alert.event_type}
                      {alert.severity === "critical" && <span className="ml-2 text-xs text-pomegranate-400">critical</span>}
                    </p>
                    {alert.error_message && <p className="text-xs text-slate-400 mt-1 truncate">{alert.error_message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Social Posts" subtitle="Last 30 days" icon={Share2} tone="emerald" href="/admin/channels" linkLabel="Channels" className="lg:col-span-2">
          {socialError ? (
            <QueryErrorNote what="social posts" message={socialError.message} />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-1 content-start">
                <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400">Posted</p>
                  <p className="text-2xl font-bold text-white mt-1">{(socialPosted.count ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400">Failed</p>
                  <p className={`text-2xl font-bold mt-1 ${(socialFailed.count ?? 0) > 0 ? "text-pomegranate-400" : "text-white"}`}>
                    {(socialFailed.count ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                {socialRows.length === 0 ? (
                  <EmptyState>No social posts yet.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {socialRows.map((post) => {
                      const productName = oneRelation<{ name_en: string }>(post.products)?.name_en ?? "Deleted product";
                      return (
                        <div key={post.id} className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">
                              {humanize(post.platform)} · {productName}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {formatDateTime(post.posted_at ?? post.updated_at)}
                              {post.status === "failed" && post.error ? ` · ${post.error}` : ""}
                            </p>
                          </div>
                          {post.status === "posted" && post.external_url ? (
                            <a
                              href={post.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
                            >
                              Posted ↗
                            </a>
                          ) : (
                            <span className={`text-xs font-semibold whitespace-nowrap ${post.status === "failed" ? "text-pomegranate-400" : "text-emerald-400"}`}>
                              {humanize(post.status)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
