-- ============================================================================
-- Upside Tree — products in more than one collection
--
-- WHY THIS EXISTS
-- A product has one primary collection (products.collection_id). Printify
-- apparel is unisex — tagged both Men's and Women's clothing — so with a
-- single collection it could only appear under Men, leaving Women's
-- sweatshirts/hoodies empty. additional_collection_ids lists the other
-- collections a product also appears in. The primary still drives the
-- product page breadcrumb, collection banner and related products.
--
-- An array rather than a join table keeps storefront queries single-table
-- (PostgREST `ov` overlap filter) at this catalog size. No FK is possible on
-- array elements: a deleted collection simply stops matching.
--
-- Safe to run more than once. The app works before it's applied (it falls
-- back to primary collections only).
-- ============================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS additional_collection_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_additional_collection_ids
  ON public.products USING GIN (additional_collection_ids);

COMMIT;

-- Ask PostgREST to reload its schema cache so the API sees the new column
NOTIFY pgrst, 'reload schema';
