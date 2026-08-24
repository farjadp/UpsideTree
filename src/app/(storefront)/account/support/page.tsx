import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AccountFlash } from "@/components/account/AccountFlash";
import {
  requireCustomer,
  formatDate,
  ticketStatusStyle,
  humanize,
  oneRelation,
  type RelatedOrderRef,
} from "@/lib/account";
import { LifeBuoy, ChevronRight, Plus } from "lucide-react";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, subject, category, status, last_message_at, created_at, orders(order_number)")
    .eq("customer_id", user.id)
    .order("last_message_at", { ascending: false });

  const list = tickets ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#18231F]">Support</h2>
          <p className="text-gray-500">Questions, returns, and anything else we can help with.</p>
        </div>
        <Link href="/account/support/new">
          <Button className="gap-2 bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
            <Plus className="h-4 w-4" />
            New request
          </Button>
        </Link>
      </div>

      <AccountFlash message={message} error={error} />

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#18231F]/15 py-16 text-center">
          <LifeBuoy className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h3 className="font-serif text-lg text-[#18231F]">No support requests</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            If something isn&apos;t right with an order — or you just have a question — open a request and
            we&apos;ll get back to you.
          </p>
          <Link href="/account/support/new" className="mt-6 inline-block">
            <Button className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">Open a request</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#18231F]/10 overflow-hidden rounded-xl border border-[#18231F]/10">
          {list.map((ticket) => {
            const relatedOrder = oneRelation<RelatedOrderRef>(ticket.orders);

            return (
            <Link
              key={ticket.id}
              href={`/account/support/${ticket.id}`}
              className="flex items-center gap-4 p-5 transition-colors hover:bg-[#F4EFE3]/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-[#18231F]">{ticket.subject}</span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${ticketStatusStyle(ticket.status)}`}
                  >
                    {humanize(ticket.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-mono text-xs">{ticket.ticket_number}</span>
                  {" · "}
                  {humanize(ticket.category)}
                  {relatedOrder?.order_number ? ` · ${relatedOrder.order_number}` : ""}
                </p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>Updated</p>
                <p>{formatDate(ticket.last_message_at ?? ticket.created_at)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
