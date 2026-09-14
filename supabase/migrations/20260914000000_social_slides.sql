-- ============================================================================
-- Upside Tree — Instagram carousel slides
--
-- Instagram posts are now a storytelling carousel: the AI hero scene, an AI
-- close-up of the design, and real product photos framed for 4:5. The hero
-- stays in social_assets.image_url (Telegram and Pinterest use it); the full
-- ordered carousel lives here.
--
-- Safe to run more than once.
-- ============================================================================

ALTER TABLE public.social_assets
  ADD COLUMN IF NOT EXISTS slide_urls TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
