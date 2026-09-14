import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AccountFlash } from "@/components/account/AccountFlash";
import {
  requireCustomer,
  formatDateTime,
  ticketStatusStyle,
  humanize,
  oneRelation,
  type RelatedOrderRef,
} from "@/lib/account";
import { replyToTicket, closeTicket } from "../../actions";
import { ArrowLeft } from "lucide-react";
import { supportCategoryLabel } from "@/lib/support-categories";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { id } = await params;
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, orders(id, order_number)")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!ticket) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("id, author_role, body, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const thread = messages ?? [];
  const isClosed = ticket.status === "closed";
  const relatedOrder = oneRelation<RelatedOrderRef>(ticket.orders);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/support"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#1D4E89] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All requests
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#18231F]">{ticket.subject}</h2>
          <p className="text-sm text-gray-500">
            <span className="font-mono text-xs">{ticket.ticket_number}</span>
            {" · "}
            {supportCategoryLabel(ticket.category)}
            {relatedOrder?.order_number && (
              <>
                {" · "}
                <Link href={`/account/orders/${relatedOrder.id}`} className="text-[#1D4E89] hover:underline">
                  {relatedOrder.order_number}
                </Link>
              </>
            )}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${ticketStatusStyle(ticket.status)}`}
        >
          {humanize(ticket.status)}
        </span>
      </div>

      <AccountFlash message={message} error={error} />

      {/* Thread */}
      <div className="space-y-4">
        {thread.map((entry) => {
          const fromSupport = entry.author_role === "admin";
          return (
            <div
              key={entry.id}
              className={`rounded-xl border p-5 ${
                fromSupport ? "border-[#1D4E89]/20 bg-[#1D4E89]/5" : "border-[#18231F]/10 bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-[#18231F]">
                  {fromSupport ? "Upside Tree Support" : "You"}
                </span>
                <span className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{entry.body}</p>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      {isClosed ? (
        <div className="rounded-xl border border-dashed border-[#18231F]/15 p-6 text-center">
          <p className="text-sm text-gray-500">
            This request is closed. Need more help?{" "}
            <Link href="/account/support/new" className="text-[#1D4E89] hover:underline">
              Open a new request
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <form action={replyToTicket} className="space-y-3">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <textarea
              name="body"
              rows={5}
              required
              maxLength={5000}
              placeholder="Write a reply…"
              className="w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
            />
            <div className="flex justify-end">
              <Button type="submit" className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
                Send reply
              </Button>
            </div>
          </form>

          <form action={closeTicket} className="flex justify-end border-t border-[#18231F]/10 pt-4">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600 hover:underline">
              Mark this request as resolved and close it
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
