import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { GIVING_RATE } from "@/lib/pricing";

// The giving program: GIVING_RATE (3%) of every paid order's product
// subtotal is set aside for people in need in Iran, and reported every 3-6
// months. Pricing always accounts for it; whether it's shown to shoppers is
// a setting, off until the legal review is done.

const SETTING = { namespace: "general", key: "giving_program" } as const;

export type GivingSettings = { enabled: boolean };

export async function getGivingSettings(supabase: SupabaseClient): Promise<GivingSettings> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("namespace", SETTING.namespace)
    .eq("key", SETTING.key)
    .maybeSingle();
  try {
    const parsed = data?.value ? (JSON.parse(data.value) as Partial<GivingSettings>) : {};
    return { enabled: parsed.enabled === true };
  } catch {
    return { enabled: false };
  }
}

export async function saveGivingSettings(supabase: SupabaseClient, settings: GivingSettings, userId: string) {
  return supabase.from("settings").upsert(
    {
      namespace: SETTING.namespace,
      key: SETTING.key,
      value: JSON.stringify(settings),
      value_type: "json",
      label_en: "Giving program",
      label_fa: "برنامهٔ کمک به نیازمندان",
      description: "Show the 3% giving commitment on the storefront.",
      // Public so the storefront can read whether to show it.
      is_public: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "namespace,key" }
  );
}

/** Amount set aside from an order, in the order's currency. */
export function givingForSubtotal(subtotal: number) {
  return Math.round(subtotal * GIVING_RATE * 100) / 100;
}

export type GivingPeriod = { label: string; start: string; end: string; orders: number; collectedCad: number };

/**
 * Giving collected from paid orders, per calendar quarter, in CAD (orders in
 * other currencies are converted back with their stored exchange_rate).
 */
export async function getGivingByQuarter(supabase: SupabaseClient): Promise<GivingPeriod[]> {
  const { data } = await supabase
    .from("orders")
    .select("subtotal, discount_amount, exchange_rate, paid_at, created_at")
    .eq("payment_status", "paid");

  const periods = new Map<string, GivingPeriod>();
  for (const order of data ?? []) {
    const date = new Date(order.paid_at ?? order.created_at);
    const quarter = Math.floor(date.getUTCMonth() / 3);
    const year = date.getUTCFullYear();
    const key = `${year}-Q${quarter + 1}`;
    const start = new Date(Date.UTC(year, quarter * 3, 1));
    const end = new Date(Date.UTC(year, quarter * 3 + 3, 0));
    const productSubtotalCad =
      (Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0)) / (Number(order.exchange_rate) || 1);

    const period = periods.get(key) ?? {
      label: key,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      orders: 0,
      collectedCad: 0,
    };
    period.orders += 1;
    period.collectedCad += productSubtotalCad * GIVING_RATE;
    periods.set(key, period);
  }

  return [...periods.values()]
    .map((period) => ({ ...period, collectedCad: Math.round(period.collectedCad * 100) / 100 }))
    .sort((a, b) => b.start.localeCompare(a.start));
}

export type GivingReport = {
  id: string;
  period_start: string;
  period_end: string;
  collected_cad: number | string;
  donated_cad: number | string;
  recipient: string;
  recipient_url: string | null;
  proof_url: string | null;
  notes_en: string | null;
  notes_fa: string | null;
  published: boolean;
  created_at: string;
};
