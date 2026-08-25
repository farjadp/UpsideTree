-- ============================================================================
-- Upside Tree — Collections hierarchy (parent_id)
--
-- WHY THIS EXISTS
-- The catalog is being reorganized into Printify-style categories:
-- 5 main categories (Men, Women, Kids, Accessories, Home and Living),
-- each with subcategories (Sweatshirts, Mugs, Jewelry, ...). The
-- collections table was flat, so this adds a self-referencing parent_id.
--
-- ON DELETE CASCADE: deleting a main category removes its subcategories;
-- products.collection_id is already ON DELETE SET NULL so products are
-- orphaned (not deleted) either way.
-- ============================================================================

BEGIN;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.collections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collections_parent_id ON public.collections(parent_id);

COMMIT;

-- Ask PostgREST to reload its schema cache so the API sees the new column
NOTIFY pgrst, 'reload schema';
