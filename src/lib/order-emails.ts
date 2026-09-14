import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmail, type SendEmailResult } from "@/lib/email";
import { getGivingSettings, givingForSubtotal } from "@/lib/giving";

// Customer order emails, bilingual (English first, Persian below) because
// orders don't record which language the customer shopped in. Email clients
// ignore stylesheets, so this is table layout + inline styles by necessity —
// the one place in the codebase where that's correct.

type OrderEmailRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  subtotal: number | string;
  discount_amount: number | string | null;
  gift_wrap_fee: number | string | null;
  shipping_cost: number | string | null;
  tax_amount: number | string | null;
  total: number | string;
  currency: string | null;
  shipping_address: Record<string, string> | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
};

type OrderEmailItem = {
  quantity: number;
  total_price: number | string;
  product_snapshot: { name_en?: string; name_fa?: string } | null;
};

// Same output as formatMoney in lib/account, which can't be imported here
// without pulling next/navigation into webhook handlers.
function formatMoney(amount: number | string | null | undefined, currency: string) {
  const value = new Intl.NumberFormat("en-CA", { style: "currency", currency, currencyDisplay: "symbol" }).format(
    Number(amount ?? 0)
  );
  return `${value} ${currency}`;
}

const INK = "#18231F";
const LAPIS = "#1D4E89";
const IVORY = "#F4EFE3";
const MUTED = "#5B6660";
const RULE = "#E2DACB";

const ORDER_COLUMNS =
  "id, order_number, customer_id, customer_name, customer_email, subtotal, discount_amount, gift_wrap_fee, shipping_cost, tax_amount, total, currency, shipping_address, tracking_carrier, tracking_number, tracking_url";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || null;
}

function firstName(order: OrderEmailRow) {
  return order.customer_name.trim().split(/\s+/)[0] ?? "";
}

function addressLines(address: Record<string, string> | null) {
  if (!address) return [];
  return [
    address.line1,
    address.line2,
    [address.city, address.province, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line));
}

// Guests have no account page to land on; send them to the store instead.
function orderLink(order: OrderEmailRow) {
  const base = siteUrl();
  if (!base) return null;
  return order.customer_id
    ? { url: `${base}/account/orders/${order.id}`, label: "View your order · مشاهدهٔ سفارش" }
    : { url: base, label: "Visit the store · رفتن به فروشگاه" };
}

function button(link: { url: string; label: string } | null) {
  if (!link) return "";
  return `<tr><td style="padding:8px 32px 32px;">
  <a href="${escapeHtml(link.url)}" style="display:inline-block;background:${LAPIS};color:#ffffff;text-decoration:none;font-size:14px;padding:12px 22px;border-radius:6px;">
    ${link.label}
  </a>
</td></tr>`;
}

function shell({
  heading,
  introEn,
  introFa,
  body,
}: {
  heading: string;
  introEn: string;
  introFa: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${IVORY};font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;">
  <tr><td style="padding:32px 32px 8px;">
    <div style="font-size:13px;letter-spacing:2px;color:${LAPIS};">UPSIDE TREE</div>
    <h1 style="margin:16px 0 8px;font-size:24px;font-weight:normal;color:${INK};">${heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:${INK};">${introEn}</p>
    <p dir="rtl" style="margin:16px 0 0;font-size:15px;line-height:1.9;color:${INK};font-family:Tahoma,Arial,sans-serif;">${introFa}</p>
  </td></tr>
  ${body}
</table>
<p style="margin:16px 0 0;font-size:12px;color:${MUTED};">Questions? Just reply to this email.</p>
</td></tr>
</table>
</body>
</html>`;
}

export function buildOrderConfirmationEmail(
  order: OrderEmailRow,
  items: OrderEmailItem[],
  { givingEnabled = false }: { givingEnabled?: boolean } = {}
) {
  const currency = order.currency ?? "CAD";
  const money = (value: number | string | null) => formatMoney(value ?? 0, currency);
  const name = firstName(order);
  const number = escapeHtml(order.order_number);

  const totals: Array<[string, string, string]> = [["Subtotal", "جمع جزء", money(order.subtotal)]];
  if (Number(order.discount_amount) > 0) totals.push(["Discount", "تخفیف", `−${money(order.discount_amount)}`]);
  if (Number(order.gift_wrap_fee) > 0) totals.push(["Gift wrapping", "بسته‌بندی هدیه", money(order.gift_wrap_fee)]);
  totals.push(["Shipping", "ارسال", money(order.shipping_cost)]);
  if (Number(order.tax_amount) > 0) totals.push(["Tax", "مالیات", money(order.tax_amount)]);

  const itemRows = items
    .map((item) => {
      const nameEn = item.product_snapshot?.name_en ?? "Item";
      const nameFa = item.product_snapshot?.name_fa;
      const faLine =
        nameFa && nameFa !== nameEn
          ? `<div dir="rtl" style="color:${MUTED};font-size:13px;text-align:left;">${escapeHtml(nameFa)}</div>`
          : "";
      return `<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-size:14px;color:${INK};">
    ${escapeHtml(nameEn)}${faLine}
    <div style="color:${MUTED};font-size:13px;">× ${item.quantity}</div>
  </td>
  <td align="right" style="padding:12px 0;border-bottom:1px solid ${RULE};font-size:14px;color:${INK};white-space:nowrap;vertical-align:top;">${escapeHtml(money(item.total_price))}</td>
</tr>`;
    })
    .join("");

  const totalRows = totals
    .map(
      ([en, fa, value]) => `<tr>
  <td style="padding:4px 0;font-size:14px;color:${MUTED};">${en} · <span dir="rtl">${fa}</span></td>
  <td align="right" style="padding:4px 0;font-size:14px;color:${INK};white-space:nowrap;">${escapeHtml(value)}</td>
</tr>`
    )
    .join("");

  const address = addressLines(order.shipping_address);
  const addressBlock = address.length
    ? `<tr><td style="padding:24px 32px 8px;">
    <div style="font-size:12px;letter-spacing:1px;color:${MUTED};">SHIPPING TO · <span dir="rtl">آدرس ارسال</span></div>
    <div style="margin-top:6px;font-size:14px;line-height:1.6;color:${INK};">${[order.customer_name, ...address].map(escapeHtml).join("<br>")}</div>
  </td></tr>`
    : "";

  const link = orderLink(order);

  // Only while the giving program is public (admin > Giving).
  const givingAmount = money(givingForSubtotal(Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0)));
  const givingBlock = givingEnabled
    ? `<tr><td style="padding:16px 32px 0;">
    <div style="background:${IVORY};border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.6;color:${INK};">
      3% of your order's product total (${escapeHtml(givingAmount)}) goes to people in need in Iran, through registered charities.
      <div dir="rtl" style="margin-top:6px;font-family:Tahoma,Arial,sans-serif;">۳٪ از مبلغ محصولات سفارش شما (${escapeHtml(givingAmount)}) از طریق خیریه‌های معتبر صرف کمک به مردم نیازمند ایران می‌شود.</div>
    </div>
  </td></tr>`
    : "";

  const html = shell({
    heading: `Thank you${name ? `, ${escapeHtml(name)}` : ""}.`,
    introEn: `Your payment went through and order <strong>${number}</strong> is confirmed. Every piece is made to order, so production starts now — we'll email you again with tracking once it ships.`,
    introFa: `پرداخت شما انجام شد و سفارش <strong>${number}</strong> ثبت شد. هر محصول سفارشی ساخته می‌شود و تولیدش از همین حالا شروع شده است. هنگام ارسال، کد رهگیری را برایتان ایمیل می‌کنیم.`,
    body: `<tr><td style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${totalRows}
      <tr>
        <td style="padding:10px 0 0;font-size:16px;color:${INK};border-top:1px solid ${RULE};"><strong>Total · <span dir="rtl">مجموع</span></strong></td>
        <td align="right" style="padding:10px 0 0;font-size:16px;color:${INK};border-top:1px solid ${RULE};white-space:nowrap;"><strong>${escapeHtml(money(order.total))}</strong></td>
      </tr>
    </table>
  </td></tr>
  ${givingBlock}
  ${addressBlock}
  ${button(link)}`,
  });

  const text = [
    `Thank you${name ? `, ${name}` : ""}.`,
    "",
    `Order ${order.order_number} is confirmed. Every piece is made to order — we'll email tracking once it ships.`,
    `سفارش ${order.order_number} ثبت شد. هنگام ارسال، کد رهگیری را برایتان ایمیل می‌کنیم.`,
    "",
    ...items.map((item) => `${item.product_snapshot?.name_en ?? "Item"} × ${item.quantity} — ${money(item.total_price)}`),
    "",
    ...totals.map(([en, , value]) => `${en}: ${value}`),
    `Total: ${money(order.total)}`,
    ...(address.length ? ["", "Shipping to:", order.customer_name, ...address] : []),
    ...(link ? ["", link.url] : []),
  ].join("\n");

  return { subject: `Order ${order.order_number} confirmed · سفارش شما ثبت شد`, html, text };
}

export function buildOrderShippedEmail(order: OrderEmailRow) {
  const name = firstName(order);
  const number = escapeHtml(order.order_number);
  const carrier = order.tracking_carrier?.replace(/[_-]+/g, " ").toUpperCase() ?? null;

  const trackingRows = order.tracking_number
    ? `<tr><td style="padding:16px 32px 8px;">
    <div style="font-size:12px;letter-spacing:1px;color:${MUTED};">TRACKING · <span dir="rtl">کد رهگیری</span></div>
    <div style="margin-top:6px;font-size:16px;color:${INK};">${carrier ? `${escapeHtml(carrier)} · ` : ""}<strong>${escapeHtml(order.tracking_number)}</strong></div>
  </td></tr>`
    : "";

  const link = order.tracking_url
    ? { url: order.tracking_url, label: "Track your package · رهگیری مرسوله" }
    : orderLink(order);

  const html = shell({
    heading: `On its way${name ? `, ${escapeHtml(name)}` : ""}.`,
    introEn: `Order <strong>${number}</strong> has left production and is heading to you.`,
    introFa: `سفارش <strong>${number}</strong> تولید و ارسال شد و در راه شماست.`,
    body: `${trackingRows}${button(link)}`,
  });

  const text = [
    `On its way${name ? `, ${name}` : ""}.`,
    "",
    `Order ${order.order_number} has shipped.`,
    `سفارش ${order.order_number} ارسال شد.`,
    ...(order.tracking_number ? ["", `Tracking: ${carrier ? `${carrier} ` : ""}${order.tracking_number}`] : []),
    ...(link ? ["", link.url] : []),
  ].join("\n");

  return { subject: `Order ${order.order_number} has shipped · سفارش شما ارسال شد`, html, text };
}

async function loadOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", orderId).single();
  if (error || !data) {
    return { order: null, reason: error?.message ?? "Order not found." };
  }
  return { order: data as OrderEmailRow, reason: null };
}

export async function sendOrderConfirmationEmail(
  supabase: SupabaseClient,
  orderId: string
): Promise<SendEmailResult> {
  const { order, reason } = await loadOrder(supabase, orderId);
  if (!order) return { ok: false, skipped: false, reason: reason ?? "Order not found." };

  const { data: items, error } = await supabase
    .from("order_items")
    .select("quantity, total_price, product_snapshot")
    .eq("order_id", orderId);
  if (error) return { ok: false, skipped: false, reason: error.message };

  const giving = await getGivingSettings(supabase).catch(() => ({ enabled: false }));
  const email = buildOrderConfirmationEmail(order, (items ?? []) as OrderEmailItem[], { givingEnabled: giving.enabled });
  return sendEmail({ to: order.customer_email, ...email });
}

export async function sendOrderShippedEmail(
  supabase: SupabaseClient,
  orderId: string
): Promise<SendEmailResult> {
  const { order, reason } = await loadOrder(supabase, orderId);
  if (!order) return { ok: false, skipped: false, reason: reason ?? "Order not found." };

  return sendEmail({ to: order.customer_email, ...buildOrderShippedEmail(order) });
}
