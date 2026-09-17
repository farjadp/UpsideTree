-- ============================================================================
-- Upside Tree — social posts held by the Brand Charter review
--
-- The social engine now reviews every AI-written post against the Brand
-- Charter. A post the reviewer won't approve is 'blocked': it isn't retried
-- automatically and waits for a person in /admin/channels.
--
-- Safe to run more than once.
-- ============================================================================

ALTER TABLE public.social_assets DROP CONSTRAINT IF EXISTS social_assets_status_check;
ALTER TABLE public.social_assets
  ADD CONSTRAINT social_assets_status_check
  CHECK (status IN ('queued', 'done', 'failed', 'skipped', 'blocked'));

NOTIFY pgrst, 'reload schema';
