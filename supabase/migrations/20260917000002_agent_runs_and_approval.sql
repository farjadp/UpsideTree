-- ============================================================================
-- Upside Tree — approval gate, run log and founder feedback (Agentic Phase 1)
--
-- Nothing posts without the founder's approval any more. A generated post
-- waits in 'review' (preview sent to the approval chat in Telegram, or acted
-- on in /admin/channels), becomes 'approved' when accepted and is published
-- by the next run, or 'rejected' with a reason.
--
-- social_assets.pending_product  the brand rewrite of a supplier-default
--                                product (name, slug, descriptions), applied
--                                only when the post is approved.
-- social_assets.review           where the preview went: chat and message ids,
--                                and what reply the bot is waiting for.
-- agent_runs                     every agent or tool step: what ran, on what,
--                                how long, with what result.
-- feedback_events                every founder decision on a draft, with the
--                                reason; the learning loop reads these.
--
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.social_assets DROP CONSTRAINT IF EXISTS social_assets_status_check;
ALTER TABLE public.social_assets
  ADD CONSTRAINT social_assets_status_check
  CHECK (status IN ('queued', 'review', 'approved', 'rejected', 'done', 'failed', 'skipped', 'blocked'));

ALTER TABLE public.social_assets
  ADD COLUMN IF NOT EXISTS pending_product JSONB,
  ADD COLUMN IF NOT EXISTS review JSONB,
  ADD COLUMN IF NOT EXISTS forced_angle TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent VARCHAR NOT NULL,
    workflow VARCHAR NOT NULL DEFAULT 'social_post',
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    status VARCHAR NOT NULL CHECK (status IN ('ok', 'failed', 'blocked')),
    model TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd NUMERIC(10, 4),
    duration_ms INTEGER NOT NULL,
    output JSONB,
    evaluation JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_product ON public.agent_runs (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON public.agent_runs (agent, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feedback_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    decision VARCHAR NOT NULL CHECK (decision IN ('approved', 'rejected', 'edited', 'alt_chosen')),
    reason_code VARCHAR,
    note TEXT,
    edited_text TEXT,
    source VARCHAR NOT NULL DEFAULT 'telegram' CHECK (source IN ('telegram', 'admin')),
    copy_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_events_product ON public.feedback_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_events_reason ON public.feedback_events (reason_code, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to agent_runs" ON public.agent_runs;
CREATE POLICY "Admins have full access to agent_runs" ON public.agent_runs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to feedback_events" ON public.feedback_events;
CREATE POLICY "Admins have full access to feedback_events" ON public.feedback_events FOR ALL USING (public.is_admin());

COMMIT;

NOTIFY pgrst, 'reload schema';
