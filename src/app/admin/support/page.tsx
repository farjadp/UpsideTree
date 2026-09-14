import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateTime, humanize } from "@/lib/account";
import { supportCategoryLabel } from "@/lib/support-categories";
import {
  ADMIN_PAGE_SIZE,
  AdminPagination,
  buildPageHref,
  isRangeNotSatisfiable,
  pageRange,
  parsePage,
} from "@/components/admin/AdminPagination";

const STATUS_FILTERS = [
  { value: "active", label: "Needs attention" },
  { value: "pending", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "text-red-300",
  high: "text-orange-300",
  normal: "text-slate-400",
  low: "text-slate-500",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const { status = "active", category = "", q = "", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const { from, to } = pageRange(page);
  const supabase = await createClient();

  let query = supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, subject, category, status, priority, guest_name, guest_email, order_reference, last_message_at, created_at, customer_profiles(email, first_name, last_name)",
      { count: "exact" }
    )
    .order("last_message_at", { ascending: false })
    .range(from, to);

  if (status === "active") query = query.eq("status", "open");
  else if (status !== "all") query = query.eq("status", status);
  if (category === "complaint") query = query.eq("category", "complaint");

  const term = q.trim().replace(/[,()*%]/g, " ").trim();
  if (term) {
    query = query.or(`ticket_number.ilike.*${term}*,subject.ilike.*${term}*,guest_email.ilike.*${term}*,order_reference.ilike.*${term}*`);
  }

  const { data: tickets, error, count } = await query;
  const filterParams = { status, category: category || undefined, q: term || undefined };

  if (page > 1 && isRangeNotSatisfiable(error)) {
    redirect(buildPageHref("/admin/support", filterParams, 1));
  }
  if (error) console.error("Error fetching support tickets:", error);

  const { count: openComplaints } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("category", "complaint")
    .in("status", ["open", "pending"]);

  const href = (next: { status?: string; category?: string }) => {
    const params = new URLSearchParams();
    params.set("status", next.status ?? status);
    const nextCategory = next.category ?? category;
    if (nextCategory) params.set("category", nextCategory);
    if (term) params.set("q", term);
    return `/admin/support?${params.toString()}`;
  };

  const pill = (active: boolean) =>
    `rounded-xl border px-3 py-1.5 text-xs font-medium ${
      active ? "border-gold-500/50 bg-gold-500/15 text-gold-300" : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
    }`;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Support</h1>
        <p className="text-sm text-slate-400">
          Requests and complaints from the public support form and customer accounts. Complaints: acknowledge within 2
          business days, resolve within 10.
        </p>
      </div>

      {(openComplaints ?? 0) > 0 && (
        <Link
          href={href({ status: "all", category: "complaint" })}
          className="block rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-200 hover:bg-orange-500/15"
        >
          {openComplaints} unresolved complaint{openComplaints === 1 ? "" : "s"} — review now
        </Link>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form action="/admin/support" className="w-full max-w-sm">
          <input type="hidden" name="status" value={status} />
          {category && <input type="hidden" name="category" value={category} />}
          <input
            name="q"
            defaultValue={term}
            placeholder="Ticket, subject, email, or order number"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Link key={filter.value} href={href({ status: filter.value })} className={pill(status === filter.value)}>
              {filter.label}
            </Link>
          ))}
          <Link
            href={href({ category: category === "complaint" ? "" : "complaint" })}
            className={pill(category === "complaint")}
          >
            Complaints only
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!tickets || tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {status === "active" && !term && !category ? "Inbox zero — nothing needs attention." : "No requests match."}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const profile = Array.isArray(ticket.customer_profiles)
                    ? ticket.customer_profiles[0]
                    : ticket.customer_profiles;
                  const name =
                    ticket.guest_name ||
                    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
                    "—";
                  const email = ticket.guest_email || profile?.email || "";
                  return (
                    <tr key={ticket.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link href={`/admin/support/${ticket.id}`} className="font-medium text-white hover:text-gold-300">
                          {ticket.subject}
                        </Link>
                        <div className="font-mono text-xs text-slate-500">
                          {ticket.ticket_number}
                          {ticket.order_reference ? ` · ${ticket.order_reference}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200">{name}</div>
                        <div className="text-xs text-slate-500">
                          {email}
                          {!profile && " · guest"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={ticket.category === "complaint" ? "font-medium text-orange-300" : "text-slate-300"}>
                          {supportCategoryLabel(ticket.category)}
                        </div>
                        <div className={`text-xs ${PRIORITY_STYLE[ticket.priority] ?? "text-slate-400"}`}>
                          {humanize(ticket.priority)} priority
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[ticket.status] ?? STATUS_STYLE.closed}`}
                        >
                          {humanize(ticket.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(ticket.last_message_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/10">
          <AdminPagination
            page={page}
            total={count ?? 0}
            pageSize={ADMIN_PAGE_SIZE}
            basePath="/admin/support"
            searchParams={filterParams}
            itemLabel="requests"
          />
        </div>
      </div>
    </div>
  );
}
