"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/utils/supabase/server";
import { sendStaffReplyEmail } from "@/lib/support";
import { SUPPORT_LIMITS } from "@/lib/support-categories";

const STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

function back(ticketId: string, key: "message" | "error", text: string): never {
  redirect(`/admin/support/${ticketId}?${key}=${encodeURIComponent(text)}`);
}

export async function replyAsStaff(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  // Replying usually means "waiting on the customer"; staff can pick otherwise.
  const requestedStatus = String(formData.get("status") ?? "pending");
  const status = STATUSES.find((s) => s === requestedStatus) ?? "pending";
  const notify = formData.get("notify") === "on";

  if (!body) back(ticketId, "error", "Reply can't be empty.");
  if (body.length > SUPPORT_LIMITS.bodyMax) back(ticketId, "error", "Reply is too long.");

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, subject, customer_id, guest_name, guest_email")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) back(ticketId, "error", "Ticket not found.");

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: guard.userId,
    author_role: "admin",
    body,
  });
  if (error) back(ticketId, "error", error.message);

  const now = new Date().toISOString();
  await supabase
    .from("support_tickets")
    .update({
      status,
      last_message_at: now,
      updated_at: now,
      resolved_at: status === "resolved" || status === "closed" ? now : null,
    })
    .eq("id", ticketId);

  let emailNote = "";
  if (notify) {
    let email = ticket.guest_email as string | null;
    let name = (ticket.guest_name as string | null) ?? "";
    if (!email && ticket.customer_id) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("email, first_name, last_name")
        .eq("id", ticket.customer_id)
        .maybeSingle();
      email = (profile?.email as string | null) ?? null;
      name = name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    }

    if (email) {
      const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
      const result = await sendStaffReplyEmail({
        to: email,
        name,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        body,
        accountTicketUrl: ticket.customer_id && base ? `${base}/account/support/${ticketId}` : null,
      });
      emailNote = result.ok ? " Customer emailed." : ` Email NOT sent: ${result.reason}`;
    } else {
      emailNote = " No email on file — customer not notified.";
    }
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  back(ticketId, "message", `Reply saved.${emailNote}`);
}

export async function updateTicketMeta(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const ticketId = String(formData.get("ticket_id") ?? "");
  const status = STATUSES.find((s) => s === formData.get("status"));
  const priority = PRIORITIES.find((p) => p === formData.get("priority"));
  if (!status || !priority) back(ticketId, "error", "Invalid status or priority.");

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      priority,
      updated_at: now,
      resolved_at: status === "resolved" || status === "closed" ? now : null,
    })
    .eq("id", ticketId);
  if (error) back(ticketId, "error", error.message);

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  back(ticketId, "message", "Ticket updated.");
}
