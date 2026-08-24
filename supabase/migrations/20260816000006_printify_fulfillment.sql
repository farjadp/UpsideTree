-- ============================================================================
-- Upside Tree — Printify on-demand fulfillment
--
-- WHY THIS EXISTS
-- schema.sql was written against Printful (printful_order_id,
-- printful_variant_id, an admin "Send to Printful Now" button), but the
-- actual POD provider is Printify — a different company with a different
-- API. Confirmed with the owner before renaming.
--
-- Renaming is safe: every printful_* column is 100% NULL in production
-- (checked live — the single product has printful_product_id NULL and
-- product_variants is empty), so there is no data to migrate.
--
-- Also adds:
--   * the two ids Printify actually needs to resolve a printable item
--     (blueprint + print provider) which Printful's model didn't have,
--   * fulfillment bookkeeping on orders so a submission can be retried
--     safely and its failure reason is visible instead of lost in a log.
-- ============================================================================

BEGIN;

-- 1. products ---------------------------------------------------------------
ALTER TABLE public.products RENAME COLUMN printful_product_id TO printify_product_id;
ALTER TABLE public.products RENAME COLUMN printful_sync_status TO printify_sync_status;
ALTER TABLE public.products RENAME COLUMN printful_synced_at TO printify_synced_at;

-- Printify addresses a printable item as blueprint + print provider +
-- variant. Printful's model had no equivalent of the first two, so they
-- have to be added rather than renamed.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printify_blueprint_id INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS printify_print_provider_id INTEGER;

-- 2. product_variants -------------------------------------------------------
ALTER TABLE public.product_variants RENAME COLUMN printful_variant_id TO printify_variant_id;

-- Printify variant ids are integers; the Printful column was VARCHAR. The
-- table is empty so the type change is free.
ALTER TABLE public.product_variants
  ALTER COLUMN printify_variant_id TYPE INTEGER USING NULLIF(printify_variant_id, '')::INTEGER;

-- 3. orders -----------------------------------------------------------------
ALTER TABLE public.orders RENAME COLUMN printful_order_id TO printify_order_id;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_provider VARCHAR DEFAULT 'printify';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_submitted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_attempts INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;

-- When the current attempt took the order. Used to tell an in-flight
-- submission apart from one whose process died mid-call, so a crashed
-- attempt can be retried instead of leaving the order stuck looking
-- "already submitted" forever.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_claimed_at TIMESTAMPTZ;

-- Guards double-submission: the fulfillment path claims an order by
-- setting printify_order_id, and a UNIQUE index means a racing second
-- attempt fails loudly at the database instead of silently creating a
-- duplicate print job that someone has to pay for.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_printify_order_id
  ON public.orders(printify_order_id)
  WHERE printify_order_id IS NOT NULL;

-- 4. order_items ------------------------------------------------------------
ALTER TABLE public.order_items RENAME COLUMN printful_item_id TO printify_line_item_id;

COMMIT;
