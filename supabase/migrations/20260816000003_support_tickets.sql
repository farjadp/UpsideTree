-- ============================================================================
-- Upside Tree — Support tickets
--
-- WHY THIS EXISTS
-- The account area needs a way for a customer to raise and follow up on an
-- issue (often about a specific order). schema.sql has no ticket/support
-- table of any kind, so this adds one.
--
-- Modelled as a thread: one support_tickets row per issue, with an ordered
-- list of support_ticket_messages beneath it so customer and admin replies
-- live in the same conversation.
--
-- RLS NOTE
-- The messages policy checks ownership via a subquery against
-- support_tickets. That works here (unlike the guest-checkout case in
-- 20260816000002) because a ticket author is always authenticated and has
-- a SELECT policy on their own tickets — so the subquery can actually see
-- the parent row.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number VARCHAR UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject VARCHAR NOT NULL,
    category VARCHAR NOT NULL DEFAULT 'general'
      CHECK (category IN ('general', 'order', 'shipping', 'return', 'product', 'payment', 'account')),
    status VARCHAR NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
    priority VARCHAR NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
    author_role VARCHAR NOT NULL DEFAULT 'customer'
      CHECK (author_role IN ('customer', 'admin')),
    body TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer
  ON public.support_tickets(customer_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket
  ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers may reopen/close their own ticket, but must not be able to
-- reassign it to someone else — hence the matching WITH CHECK.
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins have full access to support_tickets" ON public.support_tickets;
CREATE POLICY "Admins have full access to support_tickets" ON public.support_tickets
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view messages on their own tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages on their own tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can reply to their own tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can reply to their own tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    author_role = 'customer'
    AND author_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins have full access to support_ticket_messages" ON public.support_ticket_messages;
CREATE POLICY "Admins have full access to support_ticket_messages" ON public.support_ticket_messages
  FOR ALL USING (public.is_admin());

COMMIT;
