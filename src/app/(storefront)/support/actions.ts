"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { hashIp } from "@/lib/logger/hash";
import {
  createServiceClient,
  generateTicketNumber,
  notifyInboxOfTicket,
  sendTicketReceipt,
} from "@/lib/support";
import { SUPPORT_CATEGORY_VALUES, SUPPORT_LIMITS } from "@/lib/support-categories";
import { CONTACT_EMAIL } from "@/lib/site-contact";

export type SupportFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<string, string>>;
      // Echoed back because React resets a form after its action runs.
      values?: Record<string, string>;
    }
  | { status: "success"; ticketNumber: string; category: string };

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value.replace(/[\r\n]+/g, " "));

const schema = z.object({
  name: oneLine(SUPPORT_LIMITS.name).pipe(z.string().min(2, "Please enter your name.")),
  email: z.string().trim().toLowerCase().max(SUPPORT_LIMITS.email).email("Please enter a valid email address."),
  phone: oneLine(SUPPORT_LIMITS.phone)
    .refine((value) => value === "" || /^[+()\d\s.-]{7,}$/.test(value), "Please enter a valid phone number.")
    .optional()
    .default(""),
  category: z.enum(SUPPORT_CATEGORY_VALUES, { message: "Please choose what this is about." }),
  orderReference: oneLine(SUPPORT_LIMITS.orderReference).optional().default(""),
  subject: oneLine(SUPPORT_LIMITS.subject).pipe(z.string().min(3, "Please add a short subject.")),
  body: z
    .string()
    .trim()
    .min(SUPPORT_LIMITS.bodyMin, "Please describe the issue in a little more detail.")
    .max(SUPPORT_LIMITS.bodyMax, `Please keep your message under ${SUPPORT_LIMITS.bodyMax} characters.`),
  consent: z.literal("on", { message: "Please confirm we can use these details to answer you." }),
});

// Per-email and per-IP caps. A bot can rotate emails, so the IP cap is the
// one that actually holds; the email cap stops one person flooding the inbox.
const MAX_PER_EMAIL_PER_HOUR = 3;
const MAX_PER_IP_PER_HOUR = 5;
// A human can't read and fill the form this fast; scripted posts can.
const MIN_FILL_MS = 3000;

const recentByIp = new Map<string, number[]>();

function ipRateLimited(ipHash: string | null) {
  if (!ipHash) return false;
  const now = Date.now();
  const hits = (recentByIp.get(ipHash) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= MAX_PER_IP_PER_HOUR) return true;
  hits.push(now);
  recentByIp.set(ipHash, hits);
  return false;
}

export async function submitSupportRequest(
  _prev: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  const genericError = `Something went wrong sending your request. Please try again, or email ${CONTACT_EMAIL}.`;

  // Honeypot: pretend success so bots get no signal to adapt to.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "success", ticketNumber: generateTicketNumber(), category: "general" };
  }

  const field = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const values = {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    category: field("category"),
    order_reference: field("order_reference"),
    subject: field("subject"),
    body: field("body"),
    consent: field("consent"),
  };

  // Too fast to be typed by hand. A real person with autofill could hit this,
  // so ask them to resend rather than silently dropping the request.
  const startedAt = Number(formData.get("started_at"));
  if (startedAt && Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "error", message: "That was quick! Please check your details and press Send again.", values };
  }

  const parsed = schema.safeParse({ ...values, orderReference: values.order_reference });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  const input = parsed.data;
  const headerList = await headers();
  const ipHash = hashIp(headerList.get("x-forwarded-for")?.split(",")[0]?.trim());

  if (ipRateLimited(ipHash)) {
    return { status: "error", values, message: `Too many requests from this connection. Please try again later or email ${CONTACT_EMAIL}.` };
  }

  try {
    const admin = createServiceClient();

    // Signed-in customers get the ticket on their account so they can follow it there.
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("guest_email", input.email)
      .gte("created_at", since);

    if ((recentCount ?? 0) >= MAX_PER_EMAIL_PER_HOUR) {
      return {
        status: "error",
        values,
        message: "We've already received several requests from this email in the last hour. We'll get back to you soon.",
      };
    }

    // Link the order only when the email matches it, so a guessed order
    // number can't attach someone else's order to a ticket.
    let orderId: string | null = null;
    if (input.orderReference) {
      const { data: order } = await admin
        .from("orders")
        .select("id, customer_email, customer_id")
        .eq("order_number", input.orderReference.toUpperCase())
        .maybeSingle();
      if (order && (order.customer_email?.toLowerCase() === input.email || (user && order.customer_id === user.id))) {
        orderId = order.id;
      }
    }

    const ticketId = crypto.randomUUID();
    const ticketNumber = generateTicketNumber();

    const { error: ticketError } = await admin.from("support_tickets").insert({
      id: ticketId,
      ticket_number: ticketNumber,
      customer_id: user?.id ?? null,
      guest_name: input.name,
      guest_email: input.email,
      guest_phone: input.phone || null,
      order_reference: input.orderReference || null,
      order_id: orderId,
      subject: input.subject,
      category: input.category,
      priority: input.category === "complaint" ? "high" : "normal",
      status: "open",
    });

    if (ticketError) {
      console.error("Support ticket insert failed:", ticketError);
      return { status: "error", message: genericError, values };
    }

    const { error: messageError } = await admin.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      author_id: user?.id ?? null,
      author_role: "customer",
      body: input.body,
    });

    if (messageError) {
      console.error("Support message insert failed:", messageError);
      await admin.from("support_tickets").delete().eq("id", ticketId);
      return { status: "error", message: genericError, values };
    }

    const notice = {
      ticketId,
      ticketNumber,
      subject: input.subject,
      category: input.category,
      body: input.body,
      name: input.name,
      email: input.email,
      phone: input.phone,
      orderReference: input.orderReference,
      isGuest: !user,
    };
    await Promise.all([notifyInboxOfTicket(notice, "new"), sendTicketReceipt(notice)]);

    return { status: "success", ticketNumber, category: input.category };
  } catch (err) {
    console.error("Support request failed:", err);
    return { status: "error", message: genericError, values };
  }
}
