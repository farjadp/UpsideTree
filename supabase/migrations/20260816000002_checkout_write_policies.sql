-- ============================================================================
-- Upside Tree — Checkout write policies
--
-- WHY THIS EXISTS
-- schema.sql's RLS covers reading your own cart/orders and admin full
-- access, but never grants INSERT to the person actually placing an order —
-- neither a logged-in customer nor (especially) a guest, who has no
-- auth.uid() at all. Without this, POST /api/checkout (which intentionally
-- runs as the request-scoped, non-admin client — see src/app/api/checkout/
-- route.ts) is rejected by RLS before a single row can be written.
--
-- These policies allow creating a cart/order for yourself (customer_id
-- matches your own auth.uid()) or as a guest (customer_id IS NULL). They do
-- NOT grant SELECT/UPDATE/DELETE beyond what schema.sql already allows —
-- placing an order does not let you read or modify someone else's.
--
-- cart_items / order_items are intentionally WITH CHECK (true) rather than
-- re-checking ownership of the parent cart/order: a WITH CHECK that SELECTs
-- from carts/orders to verify ownership is itself filtered by *that*
-- table's RLS, which a guest (no auth.uid()) can never satisfy — so the
-- "obviously correct" ownership-checking policy actually blocks legitimate
-- guest checkout inserts entirely. Neither table has a public SELECT
-- policy, so an unauthenticated insert here is a blind write with nothing
-- to read back; the real validation (item ownership, prices, stock) happens
-- in the trusted server route (src/app/api/checkout/route.ts) before any
-- of these inserts run.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Customers and guests can create a cart" ON public.carts;
CREATE POLICY "Customers and guests can create a cart" ON public.carts
  FOR INSERT WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers and guests can add their own cart items" ON public.cart_items;
CREATE POLICY "Customers and guests can add their own cart items" ON public.cart_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers and guests can create their own order" ON public.orders;
CREATE POLICY "Customers and guests can create their own order" ON public.orders
  FOR INSERT WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers and guests can add items to their own order" ON public.order_items;
CREATE POLICY "Customers and guests can add items to their own order" ON public.order_items
  FOR INSERT WITH CHECK (true);

COMMIT;
