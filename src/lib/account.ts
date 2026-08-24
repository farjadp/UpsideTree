import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Middleware already gates /account/*, but a page can also be reached
// through a stale client-side navigation, and RLS needs a real session
// anyway — so every account page resolves its viewer through here rather
// than assuming one exists.
export async function requireCustomer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?next=/account");
  }

  return { supabase, user };
}

export type LoyaltyTier = "Seed" | "Branch" | "Root" | "Canopy";

// Thresholds are lifetime points earned, not current balance — spending
// points must never demote someone.
const TIER_THRESHOLDS: Array<{ tier: LoyaltyTier; min: number; next: LoyaltyTier | null; target: number | null }> = [
  { tier: "Seed", min: 0, next: "Branch", target: 300 },
  { tier: "Branch", min: 300, next: "Root", target: 1000 },
  { tier: "Root", min: 1000, next: "Canopy", target: 3000 },
  { tier: "Canopy", min: 3000, next: null, target: null },
];

export const TIER_META: Record<LoyaltyTier, { color: string; fa: string }> = {
  Seed: { color: "#697A4D", fa: "دانه" },
  Branch: { color: "#1F8A8A", fa: "شاخه" },
  Root: { color: "#1D4E89", fa: "ریشه" },
  Canopy: { color: "#B48635", fa: "تاج" },
};

export function resolveTier(totalPointsEarned: number) {
  const entry = [...TIER_THRESHOLDS].reverse().find((t) => totalPointsEarned >= t.min) ?? TIER_THRESHOLDS[0];
  const pointsToNext = entry.target === null ? 0 : Math.max(0, entry.target - totalPointsEarned);
  const progressPercent = entry.target === null ? 100 : Math.min(100, (totalPointsEarned / entry.target) * 100);

  return {
    tier: entry.tier,
    next: entry.next,
    target: entry.target,
    pointsToNext,
    progressPercent,
    ...TIER_META[entry.tier],
  };
}

export function formatMoney(amount: number | string | null | undefined, currency = "CAD") {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(value)} ${currency}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  payment_failed: "bg-red-50 text-red-700 border-red-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  on_hold: "bg-slate-50 text-slate-700 border-slate-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-500 border-slate-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
  partially_refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export function orderStatusStyle(status: string | null | undefined) {
  return ORDER_STATUS_STYLES[String(status)] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-500 border-slate-200",
};

export function ticketStatusStyle(status: string | null | undefined) {
  return TICKET_STATUS_STYLES[String(status)] ?? "bg-slate-50 text-slate-700 border-slate-200";
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// This project has no generated Supabase types, so an embedded to-one
// relation (`orders(...)`, `products(...)`) comes back loosely typed and
// can be either the row or a one-element array depending on how the
// relationship is inferred. Normalise it in one place instead of casting
// to `any` at every call site.
export function oneRelation<T>(value: unknown): T | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] ?? null : value;
  return (row as T) ?? null;
}

export type OrderItemRow = {
  id: string;
  sku: string | null;
  quantity: number;
  unit_price: number | string | null;
  total_price: number | string | null;
  product_snapshot: {
    name_en?: string | null;
    name_fa?: string | null;
    image?: string | null;
    sku?: string | null;
  } | null;
};

export type RelatedOrderRef = {
  id: string;
  order_number: string;
};

export type WishlistProductRow = {
  id: string;
  slug: string;
  name_en: string | null;
  name_fa: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  currency: string | null;
  featured_image_url: string | null;
  status: string | null;
};
