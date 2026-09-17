-- ============================================================================
-- Upside Tree — two-stage review of social posts
--
-- The founder now reviews the words before any image is generated, then the
-- finished carousel before it posts:
--
--   queued → copy_review → copy_approved → review → approved → done
--
-- copy_review    caption and slide lines sent for approval; no images yet.
-- copy_approved  text accepted; the next run generates images and slides.
--
-- feedback_events gains what an edit changed, so the copywriter can learn
-- from the founder's rewrites:
--   target         'caption' | 'slides' | 'images'
--   original_text  the text before the founder's edit
--
-- Safe to run more than once.
-- ============================================================================

BEGIN;

ALTER TABLE public.social_assets DROP CONSTRAINT IF EXISTS social_assets_status_check;
ALTER TABLE public.social_assets
  ADD CONSTRAINT social_assets_status_check
  CHECK (status IN ('queued', 'copy_review', 'copy_approved', 'review', 'approved', 'rejected', 'done', 'failed', 'skipped', 'blocked'));

ALTER TABLE public.feedback_events DROP CONSTRAINT IF EXISTS feedback_events_decision_check;
ALTER TABLE public.feedback_events
  ADD CONSTRAINT feedback_events_decision_check
  CHECK (decision IN ('approved', 'rejected', 'edited', 'alt_chosen', 'new_images'));

ALTER TABLE public.feedback_events
  ADD COLUMN IF NOT EXISTS target VARCHAR,
  ADD COLUMN IF NOT EXISTS original_text TEXT,
  ADD COLUMN IF NOT EXISTS stage VARCHAR;

-- The one edit made before this migration was a caption rewrite.
UPDATE public.feedback_events
SET target = 'caption', original_text = copy_snapshot->>'instagram_caption', stage = 'visual'
WHERE decision = 'edited' AND target IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
