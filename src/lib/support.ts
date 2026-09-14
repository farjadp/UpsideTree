import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmail } from "@/lib/email";
import { supportInboxEmail } from "@/lib/site-contact";
import { supportCategoryLabel } from "@/lib/support-categories";

export function generateTicketNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `UT-T-${datePart}-${randomPart}`;
}

// Guest tickets have no auth.uid() to satisfy RLS with, so the public form
// writes with the service role after validating and rate-limiting itself.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured.");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "";
}

const INK = "#18231F";
const LAPIS = "#1D4E89";
const IVORY = "#F4EFE3";
const MUTED = "#5B6660";

function shell(inner: string) {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${IVORY};font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;">
<tr><td style="padding:32px;color:${INK};font-size:15px;line-height:1.6;">
<div style="font-size:13px;letter-spacing:2px;color:${LAPIS};margin-bottom:16px;">UPSIDE TREE</div>
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function quote(body: string) {
  return `<div style="margin:16px 0;padding:12px 16px;border-left:3px solid ${LAPIS};background:${IVORY};white-space:pre-wrap;">${escapeHtml(body)}</div>`;
}

export type TicketNotice = {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  category: string;
  body: string;
  name: string;
  email: string;
  phone?: string | null;
  orderReference?: string | null;
  isGuest: boolean;
};

/** Staff notification for a new ticket or a customer follow-up. Never throws. */
export async function notifyInboxOfTicket(notice: TicketNotice, kind: "new" | "reply") {
  const adminUrl = siteUrl() ? `${siteUrl()}/admin/support/${notice.ticketId}` : "";
  const category = supportCategoryLabel(notice.category);
  const prefix = notice.category === "complaint" ? "[COMPLAINT] " : "";
  const subject = `${prefix}${kind === "new" ? "New request" : "Customer reply"} ${notice.ticketNumber}: ${notice.subject}`;

  const details = [
    ["From", `${notice.name} <${notice.email}>${notice.isGuest ? " (guest)" : ""}`],
    ["Phone", notice.phone || "—"],
    ["Category", category],
    ["Order", notice.orderReference || "—"],
  ];

  const result = await sendEmail({
    to: supportInboxEmail(),
    replyTo: notice.email,
    subject,
    html: shell(`
<h1 style="margin:0 0 12px;font-size:20px;font-weight:normal;">${escapeHtml(subject)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
${details.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:${MUTED};">${k}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
</table>
${quote(notice.body)}
${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}" style="color:${LAPIS};">Open in admin</a> — or reply to this email to answer the customer directly.</p>` : ""}`),
    text: `${subject}\n\n${details.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${notice.body}\n\n${adminUrl}`,
  });

  if (!result.ok) console.error("Support inbox notification not sent:", result.reason);
}

/** Acknowledgement to the customer that we have their request. Never throws. */
export async function sendTicketReceipt(notice: TicketNotice) {
  const isComplaint = notice.category === "complaint";
  const timeline = isComplaint
    ? "We acknowledge complaints within 2 business days and aim to resolve them within 10 business days."
    : "We usually reply within one business day.";
  const timelineFa = isComplaint
    ? "شکایت‌ها ظرف ۲ روز کاری بررسی و حداکثر ظرف ۱۰ روز کاری رسیدگی می‌شوند."
    : "معمولاً ظرف یک روز کاری پاسخ می‌دهیم.";

  const result = await sendEmail({
    to: notice.email,
    replyTo: supportInboxEmail(),
    subject: `We've received your request · ${notice.ticketNumber}`,
    html: shell(`
<h1 style="margin:0 0 12px;font-size:22px;font-weight:normal;">We've got your message</h1>
<p style="margin:0;">Hi ${escapeHtml(notice.name.split(/\s+/)[0] || "there")}, thanks for writing to us. Your reference number is <strong>${escapeHtml(notice.ticketNumber)}</strong>. ${timeline}</p>
<p dir="rtl" style="margin:16px 0 0;font-family:Tahoma,Arial,sans-serif;line-height:1.9;">پیام شما رسید. شماره پیگیری: <strong>${escapeHtml(notice.ticketNumber)}</strong>. ${timelineFa}</p>
${quote(notice.body)}
<p style="font-size:13px;color:${MUTED};">To add anything, just reply to this email.</p>`),
    text: `We've got your message. Reference: ${notice.ticketNumber}. ${timeline}\n\n${notice.body}\n\nTo add anything, reply to this email.`,
  });

  if (!result.ok) console.error("Support receipt not sent:", result.reason);
}

/** Emails the customer when staff reply from the admin inbox. */
export async function sendStaffReplyEmail(input: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
  body: string;
  accountTicketUrl: string | null;
}) {
  return sendEmail({
    to: input.to,
    replyTo: supportInboxEmail(),
    subject: `Re: ${input.subject} · ${input.ticketNumber}`,
    html: shell(`
<p style="margin:0 0 8px;">Hi ${escapeHtml(input.name.split(/\s+/)[0] || "there")},</p>
${quote(input.body)}
${input.accountTicketUrl ? `<p><a href="${escapeHtml(input.accountTicketUrl)}" style="color:${LAPIS};">View the conversation</a></p>` : ""}
<p style="font-size:13px;color:${MUTED};">Reply to this email to continue. Reference ${escapeHtml(input.ticketNumber)}.</p>`),
    text: `Hi ${input.name},\n\n${input.body}\n\nReply to this email to continue. Reference ${input.ticketNumber}.`,
  });
}
