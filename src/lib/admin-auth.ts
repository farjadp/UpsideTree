import "server-only";

import { createClient } from "@/utils/supabase/server";

export type AdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Assert the caller is a signed-in admin.
 *
 * Needed on any route that goes on to act with the service role (Printify
 * catalog writes, fulfillment) — at that point RLS is bypassed, so this
 * check is the only thing standing between a caller and a real print job
 * or a catalog mutation.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id };
}
