-- ============================================================================
-- Upside Tree — giving reports
--
-- WHY THIS EXISTS
-- 3% of every order's product subtotal is set aside for people in need in
-- Iran. Every 3-6 months the founder publishes a written report: what was
-- collected in the period, what was given, and to whom. Each row is one
-- report; only published rows are visible on the public giving page.
--
-- Whether the giving program is shown on the storefront at all is a setting
-- (settings: general / giving), off until legal review is done.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.giving_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    collected_cad DECIMAL(10,2) NOT NULL DEFAULT 0,
    donated_cad DECIMAL(10,2) NOT NULL DEFAULT 0,
    recipient TEXT NOT NULL,
    recipient_url TEXT,
    proof_url TEXT,
    notes_en TEXT,
    notes_fa TEXT,
    published BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (period_end >= period_start)
);

ALTER TABLE public.giving_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage giving reports" ON public.giving_reports;
CREATE POLICY "Admins manage giving reports" ON public.giving_reports
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Published giving reports are public" ON public.giving_reports;
CREATE POLICY "Published giving reports are public" ON public.giving_reports
  FOR SELECT USING (published = true);

COMMIT;

NOTIFY pgrst, 'reload schema';
