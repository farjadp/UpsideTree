import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateTime, humanize } from "@/lib/account";
import { supportCategoryLabel } from "@/lib/support-categories";
import { replyAsStaff, updateTicketMeta } from "../actions";

const fieldClass =
  "rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold-500";

export default async function AdminTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const { id } = await params;
  const { message, error } = await searchParams;
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, orders(id, order_number, status, total, currency), customer_profiles(email, first_name, last_name, phone)")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("id, author_role, body, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const profile = Array.isArray(ticket.customer_profiles) ? ticket.customer_profiles[0] : ticket.customer_profiles;
  const order = Array.isArray(ticket.orders) ? ticket.orders[0] : ticket.orders;
  const name = ticket.guest_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—";
  const email = ticket.guest_email || profile?.email || "";
  const phone = ticket.guest_phone || profile?.phone || "";
  const isComplaint = ticket.category === "complaint";

  const card = "rounded-2xl border border-white/10 bg-slate-900/50 p-5";

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link href="/admin/support" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Support inbox
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white">{ticket.subject}</h1>
        <p className="text-sm text-slate-400">
          <span className="font-mono">{ticket.ticket_number}</span> · opened {formatDateTime(ticket.created_at)}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
        </div>
      )}
      {isComplaint && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">
          Complaint — acknowledge within 2 business days, resolve within 10. Record what you found and what you offered in
          your reply.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(messages ?? []).map((entry) => {
            const staff = entry.author_role === "admin";
            return (
              <div
                key={entry.id}
                className={`rounded-2xl border p-5 ${staff ? "border-gold-500/20 bg-gold-500/5" : "border-white/10 bg-slate-900/50"}`}
              >
                <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                  <span className={staff ? "font-medium text-gold-300" : "font-medium text-slate-200"}>
                    {staff ? "Upside Tree" : name}
                  </span>
                  <span className="text-slate-500">{formatDateTime(entry.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{entry.body}</p>
              </div>
            );
          })}

          <form action={replyAsStaff} className={`${card} space-y-3`}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label htmlFor="reply" className="block text-sm font-medium text-white">
              Reply
            </label>
            <textarea id="reply" name="body" rows={6} required maxLength={5000} className={`${fieldClass} w-full`} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="notify" defaultChecked className="accent-gold-500" />
                  Email the customer
                </label>
                <label className="flex items-center gap-2">
                  Then mark as
                  <select name="status" defaultValue="pending" className={fieldClass}>
                    <option value="pending">Waiting on customer</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              <button type="submit" className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-gold-400">
                Send reply
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className={card}>
            <h2 className="mb-3 text-xs uppercase text-slate-500">Customer</h2>
            <p className="text-sm text-white">{name}</p>
            {email && (
              <a href={`mailto:${email}`} className="block text-sm text-gold-300 hover:underline">
                {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="block text-sm text-slate-300 hover:underline">
                {phone}
              </a>
            )}
            <p className="mt-2 text-xs text-slate-500">{profile ? "Has an account" : "Guest"}</p>
          </div>

          <div className={card}>
            <h2 className="mb-3 text-xs uppercase text-slate-500">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Category</dt>
                <dd className={isComplaint ? "text-orange-300" : "text-slate-200"}>{supportCategoryLabel(ticket.category)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Order</dt>
                <dd className="text-slate-200">
                  {order ? (
                    <Link href={`/admin/orders/${order.id}`} className="text-gold-300 hover:underline">
                      {order.order_number}
                    </Link>
                  ) : ticket.order_reference ? (
                    <span title="Not matched to an order for this email">{ticket.order_reference} (unverified)</span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {order && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Order status</dt>
                  <dd className="text-slate-200">{humanize(order.status)}</dd>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Resolved</dt>
                  <dd className="text-slate-200">{formatDateTime(ticket.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          <form action={updateTicketMeta} className={`${card} space-y-3`}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <h2 className="text-xs uppercase text-slate-500">Status</h2>
            <select name="status" defaultValue={ticket.status} className={`${fieldClass} w-full`} aria-label="Status">
              <option value="open">Open</option>
              <option value="pending">Waiting on customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select name="priority" defaultValue={ticket.priority} className={`${fieldClass} w-full`} aria-label="Priority">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-white/20"
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
