"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/account";
import { generateTicketNumber, notifyInboxOfTicket } from "@/lib/support";
import { SUPPORT_CATEGORY_VALUES, SUPPORT_LIMITS, type SupportCategory } from "@/lib/support-categories";

// Every action here re-resolves the caller through requireCustomer() and
// scopes its write with .eq("customer_id", user.id). RLS already enforces
// ownership, but a server action is a public endpoint — the id must never
// come from the submitted form.

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value === "" ? null : value;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

// ---------------------------------------------------------------- profile

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireCustomer();

  const { error } = await supabase
    .from("customer_profiles")
    .update({
      first_name: optionalStr(formData, "first_name"),
      last_name: optionalStr(formData, "last_name"),
      display_name: optionalStr(formData, "display_name"),
      phone: optionalStr(formData, "phone"),
      birth_date: optionalStr(formData, "birth_date"),
      preferred_language: str(formData, "preferred_language") || "en",
      preferred_currency: str(formData, "preferred_currency") || "CAD",
      bio: optionalStr(formData, "bio"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  return redirect("/account?message=" + encodeURIComponent("Profile updated"));
}

// -------------------------------------------------------------- addresses

export async function saveAddress(formData: FormData) {
  const { supabase, user } = await requireCustomer();

  const id = optionalStr(formData, "id");
  const isDefault = checkbox(formData, "is_default");

  const payload = {
    customer_id: user.id,
    label: optionalStr(formData, "label"),
    first_name: str(formData, "first_name"),
    last_name: str(formData, "last_name"),
    company: optionalStr(formData, "company"),
    address_line_1: str(formData, "address_line_1"),
    address_line_2: optionalStr(formData, "address_line_2"),
    city: str(formData, "city"),
    province_state: str(formData, "province_state"),
    postal_code: str(formData, "postal_code"),
    country: str(formData, "country") || "CA",
    phone: optionalStr(formData, "phone"),
    delivery_notes: optionalStr(formData, "delivery_notes"),
    is_default: isDefault,
    updated_at: new Date().toISOString(),
  };

  // "Exactly one default" is enforced by the on_address_set_default trigger
  // (guaranteed by migration 20260816000005), which clears the flag on the
  // customer's other rows — so we only ever set it here.
  const { error } = id
    ? await supabase.from("customer_addresses").update(payload).eq("id", id).eq("customer_id", user.id)
    : await supabase.from("customer_addresses").insert(payload);

  if (error) {
    return redirect(`/account/addresses?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account/addresses");
  return redirect("/account/addresses?message=" + encodeURIComponent(id ? "Address updated" : "Address added"));
}

export async function deleteAddress(formData: FormData) {
  const { supabase, user } = await requireCustomer();
  const id = str(formData, "id");

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", user.id);

  if (error) {
    return redirect(`/account/addresses?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account/addresses");
  return redirect("/account/addresses?message=" + encodeURIComponent("Address removed"));
}

// ------------------------------------------------------------ preferences

export async function updatePreferences(formData: FormData) {
  const { supabase, user } = await requireCustomer();

  const { error } = await supabase
    .from("customer_preferences")
    .update({
      email_order_updates: checkbox(formData, "email_order_updates"),
      email_shipping_updates: checkbox(formData, "email_shipping_updates"),
      email_new_collections: checkbox(formData, "email_new_collections"),
      email_story_posts: checkbox(formData, "email_story_posts"),
      email_nowruz_campaign: checkbox(formData, "email_nowruz_campaign"),
      email_yalda_campaign: checkbox(formData, "email_yalda_campaign"),
      email_promotions: checkbox(formData, "email_promotions"),
      push_order_updates: checkbox(formData, "push_order_updates"),
      push_new_collections: checkbox(formData, "push_new_collections"),
      push_back_in_stock: checkbox(formData, "push_back_in_stock"),
      push_points_earned: checkbox(formData, "push_points_earned"),
      sms_order_updates: checkbox(formData, "sms_order_updates"),
      sms_promotions: checkbox(formData, "sms_promotions"),
      updated_at: new Date().toISOString(),
    })
    .eq("customer_id", user.id);

  if (error) {
    return redirect(`/account/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account/settings");
  return redirect("/account/settings?message=" + encodeURIComponent("Preferences saved"));
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireCustomer();

  const password = str(formData, "password");
  const confirm = str(formData, "confirm_password");

  if (password.length < 8) {
    return redirect(`/account/settings?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }
  if (password !== confirm) {
    return redirect(`/account/settings?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return redirect(`/account/settings?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/account/settings?message=" + encodeURIComponent("Password updated"));
}

// --------------------------------------------------------------- wishlist

export async function removeFromWishlist(formData: FormData) {
  const { supabase, user } = await requireCustomer();
  const productId = str(formData, "product_id");

  const { error } = await supabase
    .from("customer_wishlist")
    .delete()
    .eq("product_id", productId)
    .eq("customer_id", user.id);

  if (error) {
    return redirect(`/account/wishlist?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account/wishlist");
  return redirect("/account/wishlist");
}

// ---------------------------------------------------------------- support

async function customerContact(supabase: Awaited<ReturnType<typeof requireCustomer>>["supabase"], userId: string, email: string) {
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("first_name, last_name, phone")
    .eq("id", userId)
    .maybeSingle();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email;
  return { name, phone: (profile?.phone as string | null) ?? null };
}

export async function createTicket(formData: FormData) {
  const { supabase, user } = await requireCustomer();

  const subject = str(formData, "subject").replace(/[\r\n]+/g, " ");
  const body = str(formData, "body");
  const requestedCategory = str(formData, "category");
  const category: SupportCategory = SUPPORT_CATEGORY_VALUES.find((c) => c === requestedCategory) ?? "general";
  const requestedOrderId = optionalStr(formData, "order_id");

  const fail = (message: string) =>
    redirect(`/account/support/new?error=${encodeURIComponent(message)}`);

  if (!subject || !body) {
    return fail("Subject and message are both required.");
  }
  if (subject.length > SUPPORT_LIMITS.subject) {
    return fail(`Please keep the subject under ${SUPPORT_LIMITS.subject} characters.`);
  }
  if (body.length < SUPPORT_LIMITS.bodyMin || body.length > SUPPORT_LIMITS.bodyMax) {
    return fail(`Your message should be between ${SUPPORT_LIMITS.bodyMin} and ${SUPPORT_LIMITS.bodyMax} characters.`);
  }

  // The order id comes from the form, so confirm it's actually this customer's.
  let order: { id: string; order_number: string } | null = null;
  if (requestedOrderId) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("id", requestedOrderId)
      .eq("customer_id", user.id)
      .maybeSingle();
    order = data;
  }
  const ticketNumber = generateTicketNumber();

  // Generated client-side for the same reason as checkout: a customer has
  // no SELECT-on-insert path that would let .select() return the new row
  // before the ticket exists, and we need the id for the first message.
  const ticketId = crypto.randomUUID();

  const { error: ticketError } = await supabase.from("support_tickets").insert({
    id: ticketId,
    ticket_number: ticketNumber,
    customer_id: user.id,
    order_id: order?.id ?? null,
    order_reference: order?.order_number ?? null,
    subject,
    category,
    priority: category === "complaint" ? "high" : "normal",
    status: "open",
  });

  if (ticketError) {
    console.error("Support ticket insert failed:", ticketError);
    return fail("We couldn't send your request. Please try again.");
  }

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    author_role: "customer",
    body,
  });

  if (messageError) {
    console.error("Support message insert failed:", messageError);
    return fail("We couldn't send your request. Please try again.");
  }

  const contact = await customerContact(supabase, user.id, user.email ?? "");
  await notifyInboxOfTicket(
    {
      ticketId,
      ticketNumber,
      subject,
      category,
      body,
      name: contact.name,
      email: user.email ?? "",
      phone: contact.phone,
      orderReference: order?.order_number ?? null,
      isGuest: false,
    },
    "new"
  );

  revalidatePath("/account/support");
  return redirect(`/account/support/${ticketId}?message=${encodeURIComponent(`Request ${ticketNumber} sent. We'll reply by email and here.`)}`);
}

export async function replyToTicket(formData: FormData) {
  const { supabase, user } = await requireCustomer();

  const ticketId = str(formData, "ticket_id");
  const body = str(formData, "body");

  if (!body) {
    return redirect(`/account/support/${ticketId}?error=${encodeURIComponent("Message can't be empty.")}`);
  }
  if (body.length > SUPPORT_LIMITS.bodyMax) {
    return redirect(
      `/account/support/${ticketId}?error=${encodeURIComponent(`Please keep your reply under ${SUPPORT_LIMITS.bodyMax} characters.`)}`
    );
  }

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, subject, category, status, order_reference")
    .eq("id", ticketId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!ticket || ticket.status === "closed") {
    return redirect(`/account/support/${ticketId}?error=${encodeURIComponent("This request is closed. Please open a new one.")}`);
  }

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    author_role: "customer",
    body,
  });

  if (error) {
    console.error("Support reply insert failed:", error);
    return redirect(`/account/support/${ticketId}?error=${encodeURIComponent("We couldn't send your reply. Please try again.")}`);
  }

  // A customer reply reopens a resolved ticket — otherwise a follow-up
  // question would sit silently against a ticket nobody is watching.
  await supabase
    .from("support_tickets")
    .update({
      status: "open",
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .eq("customer_id", user.id);

  const contact = await customerContact(supabase, user.id, user.email ?? "");
  await notifyInboxOfTicket(
    {
      ticketId,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      category: ticket.category,
      body,
      name: contact.name,
      email: user.email ?? "",
      phone: contact.phone,
      orderReference: ticket.order_reference,
      isGuest: false,
    },
    "reply"
  );

  revalidatePath(`/account/support/${ticketId}`);
  return redirect(`/account/support/${ticketId}?message=${encodeURIComponent("Reply sent.")}`);
}

export async function closeTicket(formData: FormData) {
  const { supabase, user } = await requireCustomer();
  const ticketId = str(formData, "ticket_id");

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: "closed",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .eq("customer_id", user.id);

  if (error) {
    return redirect(`/account/support/${ticketId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/account/support/${ticketId}`);
  return redirect(`/account/support/${ticketId}`);
}
