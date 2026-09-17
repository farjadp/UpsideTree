-- ============================================================================
-- Upside Tree — brand lifestyle images on the product page
--
-- The social engine generates two scenes per product from the supplier photo
-- (a lifestyle shot and a close-up). Once the post is published, those scenes
-- are kept here and shown first on the product page and in listings, ahead of
-- the supplier's studio mockups.
--
-- featured_image_url stays the supplier photo: it is the reference every
-- generation and rewrite works from, and "what you actually get".
--
-- Safe to run more than once.
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS lifestyle_urls TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
