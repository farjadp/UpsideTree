import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountFlash } from "@/components/account/AccountFlash";
import { requireCustomer, formatDate } from "@/lib/account";
import { createTicket } from "../../actions";
import { ArrowLeft } from "lucide-react";
import { SUPPORT_CATEGORIES, SUPPORT_LIMITS } from "@/lib/support-categories";


export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; order?: string }>;
}) {
  const { message, error, order } = await searchParams;
  const { supabase, user } = await requireCustomer();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orderList = orders ?? [];
  // Deep-linked from an order page ("Get help with this order"), so the
  // relevant order is preselected rather than making them find it again.
  const preselected = order && orderList.some((o) => o.id === order) ? order : "";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/support"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#1D4E89] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All requests
        </Link>
        <h2 className="font-serif text-2xl font-bold text-[#18231F]">New support request</h2>
        <p className="text-gray-500">Tell us what&apos;s going on and we&apos;ll take it from there.</p>
      </div>

      <AccountFlash message={message} error={error} />

      <form action={createTicket} className="max-w-2xl space-y-5">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" required maxLength={SUPPORT_LIMITS.subject} placeholder="Brief summary of your request" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue={preselected ? "order" : "general"}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
            >
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_id">Related order (optional)</Label>
            <select
              id="order_id"
              name="order_id"
              defaultValue={preselected}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
            >
              <option value="">Not about a specific order</option>
              {orderList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {formatDate(o.created_at)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <textarea
            id="body"
            name="body"
            rows={7}
            required
            minLength={SUPPORT_LIMITS.bodyMin}
            maxLength={SUPPORT_LIMITS.bodyMax}
            placeholder="Share as much detail as you can — order numbers, what you expected, and what happened."
            className="w-full rounded-md border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4E89]"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/account/support"
            className="inline-flex h-9 items-center rounded-lg border border-[#18231F]/20 px-4 text-sm text-[#18231F] hover:bg-[#F4EFE3]"
          >
            Cancel
          </Link>
          <Button type="submit" className="bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90">
            Submit request
          </Button>
        </div>
      </form>
    </div>
  );
}
