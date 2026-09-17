import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// The run log. Every agent or tool step in a workflow leaves one row: which
// agent, on which product, how long it took, whether it worked. The analyst
// and the learning loop read from here; without it nothing can be measured.

export type RunStatus = "ok" | "failed" | "blocked";

export type RunRecord = {
  agent: string;
  workflow?: string;
  productId?: string | null;
  status: RunStatus;
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
  durationMs: number;
  output?: unknown;
  evaluation?: unknown;
  error?: string | null;
};

/** Write one run row. Never throws: a logging failure must not fail the work. */
export async function recordRun(supabase: SupabaseClient, run: RunRecord) {
  const { error } = await supabase.from("agent_runs").insert({
    agent: run.agent,
    workflow: run.workflow ?? "social_post",
    product_id: run.productId ?? null,
    status: run.status,
    model: run.model ?? null,
    tokens_in: run.tokensIn ?? null,
    tokens_out: run.tokensOut ?? null,
    cost_usd: run.costUsd ?? null,
    duration_ms: Math.round(run.durationMs),
    output: run.output ?? null,
    evaluation: run.evaluation ?? null,
    error: run.error?.slice(0, 1000) ?? null,
  });
  if (error) console.warn(`agent_runs insert failed (${run.agent}):`, error.message);
}

/** A step is "blocked" when it stops the workflow for a human rather than failing. */
export type StepOptions<T> = {
  agent: string;
  productId?: string | null;
  model?: string | null;
  /** What to keep from the result; defaults to nothing (results can be large). */
  summarize?: (result: T) => unknown;
  isBlocked?: (error: unknown) => boolean;
};

/** Run a step and log it, whatever happens. The error is rethrown untouched. */
export async function step<T>(supabase: SupabaseClient, options: StepOptions<T>, work: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    const result = await work();
    await recordRun(supabase, {
      agent: options.agent,
      productId: options.productId,
      model: options.model,
      status: "ok",
      durationMs: performance.now() - started,
      output: options.summarize?.(result),
    });
    return result;
  } catch (error) {
    await recordRun(supabase, {
      agent: options.agent,
      productId: options.productId,
      model: options.model,
      status: options.isBlocked?.(error) ? "blocked" : "failed",
      durationMs: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
