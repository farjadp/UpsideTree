-- ============================================================================
-- Upside Tree — Guest support requests and complaints
--
-- WHY THIS EXISTS
-- Support tickets could only be raised by signed-in customers, but most
-- orders are guest checkouts, and a complaint must be possible without an
-- account. The public /support form writes here with the service role
-- (after its own validation and rate limit), so no new public INSERT policy
-- is added — RLS still only lets customers see and write their own tickets.
--
-- A ticket belongs to either a customer account or a guest email.
-- ============================================================================

BEGIN;

ALTER TABLE public.support_tickets
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR,
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR,
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR,
  -- Free-text order number from the public form; guests can't pick from a
  -- list of their orders, and a typo must not block the request.
  ADD COLUMN IF NOT EXISTS order_reference VARCHAR;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_owner_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_owner_check
  CHECK (customer_id IS NOT NULL OR guest_email IS NOT NULL);

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN ('general', 'order', 'shipping', 'return', 'product', 'payment', 'account', 'complaint', 'privacy'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON public.support_tickets(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_guest_email
  ON public.support_tickets(guest_email, created_at DESC);

COMMIT;
