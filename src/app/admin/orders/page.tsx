import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney, humanize, orderStatusStyle } from "@/lib/account";
import { redirect } from "next/navigation";
import {
  ADMIN_PAGE_SIZE,
  AdminPagination,
  buildPageHref,
  isRangeNotSatisfiable,
  pageRange,
  parsePage,
} from "@/components/admin/AdminPagination";

const FULFILLMENT_FILTERS = [
  { value: "", label: "All" },
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "in_production", label: "In production" },
  { value: "fulfilled", label: "Shipped" },
] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fulfillment?: string; page?: string }>;
}) {
  const { q = "", fulfillment = "", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const { from, to } = pageRange(page);
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_email, status, payment_status, fulfillment_status, total, currency",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (FULFILLMENT_FILTERS.some((f) => f.value && f.value === fulfillment)) {
    query = query.eq("fulfillment_status", fulfillment);
  }

  // PostgREST's or() filter is comma/paren-delimited; strip those so a
  // search term can't break out into its own filter clause.
  const term = q.trim().replace(/[,()*%]/g, " ").trim();
  if (term) {
    query = query.or(
      `order_number.ilike.*${term}*,customer_name.ilike.*${term}*,customer_email.ilike.*${term}*`
    );
  }

  const { data: orders, error, count } = await query;
  const filterParams = { q: term || undefined, fulfillment: fulfillment || undefined };

  if (page > 1 && isRangeNotSatisfiable(error)) {
    redirect(buildPageHref("/admin/orders", filterParams, 1));
  }

  if (error) {
    console.error("Error fetching orders:", error);
  }

  const filterHref = (value: string) => {
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    if (value) params.set("fulfillment", value);
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Manage customer orders and fulfillments.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form action="/admin/orders" className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={term} placeholder="Order number, name or email" className="pl-9" />
          {fulfillment && <input type="hidden" name="fulfillment" value={fulfillment} />}
        </form>
        <div className="flex flex-wrap gap-2">
          {FULFILLMENT_FILTERS.map((filter) => (
            <Link key={filter.value} href={filterHref(filter.value)}>
              <Badge
                variant="outline"
                className={fulfillment === filter.value ? "bg-gray-900 text-white border-gray-900" : "bg-white"}
              >
                {filter.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orders || orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {term || fulfillment ? "No orders match this filter." : "No orders yet."}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-[#1D4E89]">
                    <Link href={`/admin/orders/${order.id}`}>#{order.order_number}</Link>
                  </TableCell>
                  <TableCell className="text-gray-500">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.customer_name}
                    <div className="text-xs text-gray-500">{order.customer_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={orderStatusStyle(order.status)}>
                      {humanize(order.status)}
                    </Badge>
                    <div className="mt-1 text-xs text-gray-500">{humanize(order.fulfillment_status)}</div>
                  </TableCell>
                  <TableCell>{formatMoney(order.total, order.currency ?? "CAD")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="border-t">
          <AdminPagination
            tone="light"
            page={page}
            total={count ?? 0}
            pageSize={ADMIN_PAGE_SIZE}
            basePath="/admin/orders"
            searchParams={filterParams}
            itemLabel="orders"
          />
        </div>
      </div>
    </div>
  );
}
