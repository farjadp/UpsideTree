-- ============================================================================
-- Upside Tree — per-product automatic pricing switch
--
-- WHY THIS EXISTS
-- Print-on-demand prices are set from cost to keep net margin between 13% and
-- 34% (src/lib/pricing.ts), and the catalog sync reprices a variant when its
-- margin drifts out of that band. auto_pricing = false leaves a product's
-- prices exactly as set in the admin.
--
-- Safe to run more than once. Before it runs, every product is treated as
-- automatically priced.
-- ============================================================================

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS auto_pricing BOOLEAN NOT NULL DEFAULT true;

COMMIT;

NOTIFY pgrst, 'reload schema';
