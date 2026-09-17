-- ============================================================================
-- Upside Tree — story text on Instagram slides
--
-- Carousel slides now carry the post's story lines, typeset by the app.
-- base_slide_urls keeps the plain images (AI scenes and framed photos) so the
-- text can be re-rendered without paying for new images; slide_urls holds the
-- versions with text that Instagram posts.
--
-- Safe to run more than once.
-- ============================================================================

ALTER TABLE public.social_assets
  ADD COLUMN IF NOT EXISTS base_slide_urls TEXT[] NOT NULL DEFAULT '{}';

-- Existing carousels were posted without text: their slides are the base images.
UPDATE public.social_assets
SET base_slide_urls = slide_urls
WHERE base_slide_urls = '{}' AND slide_urls <> '{}';

NOTIFY pgrst, 'reload schema';
