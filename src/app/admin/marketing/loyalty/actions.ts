"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/utils/supabase/server";

export async function setLoyaltyRuleActive(ruleId: string, active: boolean) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return { error: guard.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_rules").update({ active }).eq("id", ruleId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/marketing/loyalty");
  return { error: null };
}
