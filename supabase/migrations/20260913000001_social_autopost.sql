-- ============================================================================
-- Upside Tree — automatic social posts (Instagram, Telegram, Pinterest)
--
-- WHY THIS EXISTS
-- Every product that goes active gets one branded social image (generated
-- from the product photo) plus captions, and is posted to each configured
-- platform with a link back to the product page. The cron route
-- /api/social/autopost works through this queue one product at a time.
--
-- social_assets  one row per product: queue state, generated copy and image.
-- social_posts   one row per product per platform: the result of posting.
--
-- Products that are already active when this runs are marked 'skipped' so
-- turning the feature on doesn't flood the channels with the whole catalog.
-- They can be queued by hand from /admin/channels.
--
-- Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.social_assets (
    product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'done', 'failed', 'skipped')),
    copy JSONB,
    image_url TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_assets_status_queued
    ON public.social_assets (status, queued_at);

CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    platform VARCHAR NOT NULL CHECK (platform IN ('instagram', 'telegram', 'pinterest')),
    status VARCHAR NOT NULL CHECK (status IN ('posted', 'failed')),
    external_id TEXT,
    external_url TEXT,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, platform)
);

ALTER TABLE public.social_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to social_assets" ON public.social_assets;
CREATE POLICY "Admins have full access to social_assets" ON public.social_assets FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to social_posts" ON public.social_posts;
CREATE POLICY "Admins have full access to social_posts" ON public.social_posts FOR ALL USING (public.is_admin());

-- Don't post the existing catalog.
INSERT INTO public.social_assets (product_id, status, error)
SELECT id, 'skipped', 'Already active before auto-posting was enabled.'
FROM public.products
WHERE lower(status) = 'active'
ON CONFLICT (product_id) DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
