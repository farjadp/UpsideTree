"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { saveGivingSettings } from "@/lib/giving";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { error: string | null };

function refresh() {
  revalidatePath("/admin/giving");
  revalidatePath("/giving");
  // Storefront layout reads the switch for trust signals, cart and checkout.
  revalidatePath("/", "layout");
}

export async function setGivingEnabled(enabled: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await saveGivingSettings(supabase, { enabled }, guard.userId);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function createGivingReport(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const money = (name: string) => Math.round(Number(formData.get(name) || 0) * 100) / 100;
  const url = (name: string) => {
    const value = text(name);
    return /^https?:\/\//i.test(value) ? value : null;
  };

  const periodStart = text("period_start");
  const periodEnd = text("period_end");
  const recipient = text("recipient");
  if (!periodStart || !periodEnd || !recipient) {
    return { error: "Period start, period end and recipient are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("giving_reports").insert({
    period_start: periodStart,
    period_end: periodEnd,
    collected_cad: money("collected_cad"),
    donated_cad: money("donated_cad"),
    recipient,
    recipient_url: url("recipient_url"),
    proof_url: url("proof_url"),
    notes_en: text("notes_en") || null,
    notes_fa: text("notes_fa") || null,
    published: false,
    created_by: guard.userId,
  });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function setGivingReportPublished(id: string, published: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("giving_reports")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function deleteGivingReport(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  const supabase = await createClient();
  const { error } = await supabase.from("giving_reports").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}
