"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { applyDecision } from "@/lib/social/approval";
import { REJECT_REASONS, type RejectReason } from "@/lib/social/approval-protocol";
import { getServiceClient, isAutopostEnabled, runAutopost } from "@/lib/social/autopost";

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

// Post a hand-queued product right away instead of waiting for the next cron
// run (which never comes in local dev). Runs after the response, within this
// page's maxDuration; the page shows the result on the next refresh.
function postInBackground(productId: string) {
  if (!isAutopostEnabled()) {
    return "Queued. SOCIAL_AUTOPOST_ENABLED is off, so it won't post until that's set.";
  }
  after(async () => {
    try {
      await runAutopost(getServiceClient(), { productId });
    } catch (error) {
      console.error("Social autopost (manual queue) failed:", error);
    }
    revalidatePath("/admin/channels");
  });
  return "Working on it. Refresh in 2–3 minutes to see the result.";
}

/** Retry a product: platforms that already posted are left alone. */
export async function retrySocialPost(productId: string) {
  return guarded(async () => {
    const { error } = await getServiceClient()
      .from("social_assets")
      .upsert({ product_id: productId, ...requeueValues() }, { onConflict: "product_id" });
    if (error) return { error: error.message };
    return { error: null, message: postInBackground(productId) };
  });
}

/** Throw away the generated copy and image so both are made again before posting. */
export async function regenerateSocialAssets(productId: string) {
  return guarded(async () => {
    const { error } = await getServiceClient()
      .from("social_assets")
      .update(requeueValues({ copy: null, image_url: null, base_slide_urls: [], slide_urls: [] }))
      .eq("product_id", productId);
    if (error) return { error: error.message };
    return { error: null, message: postInBackground(productId) };
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

/** The founder's approval from the admin page; same trail as the Telegram buttons. */
export async function approveSocialPost(productId: string) {
  return guarded(async () => {
    const outcome = await applyDecision(getServiceClient(), productId, { kind: "approve" }, "admin");
    if (!outcome.publish) return { error: outcome.message };
    return { error: null, message: postInBackground(productId) };
  });
}

export async function rejectSocialPost(productId: string, reason: string, note: string) {
  return guarded(async () => {
    if (!(reason in REJECT_REASONS)) return { error: "Pick a reason." };
    const outcome = await applyDecision(getServiceClient(), productId, { kind: "reject", reason: reason as RejectReason, note }, "admin");
    return { error: null, message: outcome.message };
  });
}

/** Swap the winning angle for one of the copywriter's runners-up and redraft. */
export async function chooseAlternativeAngle(productId: string, index: 0 | 1) {
  return guarded(async () => {
    const outcome = await applyDecision(getServiceClient(), productId, { kind: "alt", index }, "admin");
    if (!outcome.requeue) return { error: outcome.message };
    return { error: null, message: postInBackground(productId) };
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
