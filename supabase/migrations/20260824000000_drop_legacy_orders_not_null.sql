-- ============================================================================
-- Upside Tree — Drop NOT NULL on legacy orders.total_amount
--
-- WHY THIS EXISTS
-- Found live, by an actual checkout attempt failing with:
--   null value in column "total_amount" of relation "orders"
--   violates not-null constraint
--
-- total_amount is a column from the pre-sync schema (flagged as
-- "EXTRA (live only, legacy)" during the 20260816000000 diff, alongside
-- products.description_en/description_fa/inventory_type/printful_sync and
-- products.stock_level). schema.sql replaced it with `total`, and
-- POST /api/checkout writes `total`, never `total_amount` — but nobody
-- relaxed the old NOT NULL, so every real order insert fails at the
-- database — before Stripe is ever contacted, so no Checkout Session was
-- created by these failed attempts either.
--
-- orders is confirmed empty in production, so there's no data to migrate;
-- this only removes a constraint a legacy column shouldn't still have.
-- total_amount itself is left in place (not dropped) in case anything
-- else still reads it — same conservative approach as the other legacy
-- columns from 20260816000000.
-- ============================================================================

BEGIN;

ALTER TABLE public.orders ALTER COLUMN total_amount DROP NOT NULL;

COMMIT;
