-- Anyone with the public anon key could create an order straight through
-- PostgREST: the orders INSERT policy only checked customer_id, so a row with
-- payment_status = 'paid' and any total was accepted, and order_items /
-- cart_items took WITH CHECK (true). An admin retrying fulfillment on such an
-- order would send a free print job to Printify.
--
-- POST /api/checkout now writes carts, cart_items, orders and order_items with
-- the service role after pricing on the server, so these INSERT policies are
-- no longer needed. Reads ("view your own") and the signed-in
-- "Users can manage their carts" policies are unchanged.
-- Replaces the policies from 20260816000002_checkout_write_policies.sql.

DROP POLICY IF EXISTS "Customers and guests can create a cart" ON public.carts;
DROP POLICY IF EXISTS "Customers and guests can add their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Customers and guests can create their own order" ON public.orders;
DROP POLICY IF EXISTS "Customers and guests can add items to their own order" ON public.order_items;
