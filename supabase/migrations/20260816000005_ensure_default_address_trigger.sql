-- ============================================================================
-- Upside Tree — Ensure the "only one default address" trigger exists
--
-- WHY THIS EXISTS
-- schema.sql defines handle_default_address() + on_address_set_default,
-- which clear is_default on a customer's other addresses whenever one is
-- marked default. customer_addresses predates the sync migrations in this
-- folder, so whether that trigger was ever actually applied to the live
-- database is unknown — and PostgREST gives no way to introspect triggers
-- to check.
--
-- The account address book (src/app/(storefront)/account/actions.ts) relies
-- on this trigger rather than clearing sibling rows itself, so rather than
-- assume, this re-applies it idempotently. Also repairs any customer who
-- somehow ended up with more than one default.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_address_set_default ON public.customer_addresses;
CREATE TRIGGER on_address_set_default
  BEFORE INSERT OR UPDATE OF is_default ON public.customer_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE PROCEDURE public.handle_default_address();

-- Repair: if duplicates already exist, keep the most recently updated one.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY customer_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.customer_addresses
  WHERE is_default = true
)
UPDATE public.customer_addresses a
SET is_default = false
FROM ranked
WHERE a.id = ranked.id AND ranked.rn > 1;

COMMIT;
