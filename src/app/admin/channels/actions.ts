"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getServiceClient, runAutopost } from "@/lib/social/autopost";

type ActionResult = { error: string | null; message?: string };

// Queue a product to post as soon as the next run picks it up: no grace period, attempts reset.
function requeueValues(extra: Record<string, unknown> = {}) {
  return {
    status: "queued",
    attempts: 0,
    error: null,
    locked_at: null,
    queued_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
    ...extra,
  };
}

async function guarded(run: () => Promise<ActionResult>): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };
  try {
    const result = await run();
    revalidatePath("/admin/channels");
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Retry a product: platforms that already posted are left alone. */
export async function retrySocialPost(productId: string) {
  return guarded(async () => {
    const { error } = await getServiceClient()
      .from("social_assets")
      .upsert({ product_id: productId, ...requeueValues() }, { onConflict: "product_id" });
    return { error: error?.message ?? null };
  });
}

/** Throw away the generated copy and image so both are made again before posting. */
export async function regenerateSocialAssets(productId: string) {
  return guarded(async () => {
    const { error } = await getServiceClient()
      .from("social_assets")
      .update(requeueValues({ copy: null, image_url: null }))
      .eq("product_id", productId);
    return { error: error?.message ?? null };
  });
}

export async function skipSocialPost(productId: string) {
  return guarded(async () => {
    const { error } = await getServiceClient()
      .from("social_assets")
      .update({ status: "skipped", error: "Skipped by admin.", locked_at: null, updated_at: new Date().toISOString() })
      .eq("product_id", productId);
    return { error: error?.message ?? null };
  });
}

export async function runSocialQueueNow() {
  return guarded(async () => {
    const result = await runAutopost();
    if (!result.enabled) return { error: "SOCIAL_AUTOPOST_ENABLED is not set to true." };
    if (!result.product) return { error: result.error ?? null, message: "Nothing is ready to post." };
    return {
      error: result.error ?? null,
      message: `${result.product}: ${result.outcome}`,
    };
  });
}
