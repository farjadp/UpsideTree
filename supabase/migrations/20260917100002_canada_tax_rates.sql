-- Canadian sales tax rates for checkout (src/lib/tax.ts).
--
-- tax_rates was empty and had no read policy, so checkout (which prices with
-- the visitor's anon/customer client) could never see a rate even if one
-- existed. Rates are public information: active rows are readable by anyone.
--
-- Every row is seeded INACTIVE. Upside Tree is not registered for GST/HST,
-- and a business may only charge GST/HST once registered. After registering
-- with the CRA, switch on GST/HST (and PST only for provinces you register in):
--
--   UPDATE public.tax_rates SET active = true
--   WHERE country = 'CA' AND tax_name IN ('GST', 'HST');
--
-- Rates as of September 2026 (Nova Scotia HST 14% since 1 April 2025).
-- Verify against the CRA and provincial sites before switching on.

-- DECIMAL(5,4) can't hold Quebec's 9.975%.
ALTER TABLE public.tax_rates ALTER COLUMN rate TYPE NUMERIC(7,6);

CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_country_province_name_key
  ON public.tax_rates (country, province, tax_name);

DROP POLICY IF EXISTS "Anyone can read active tax rates" ON public.tax_rates;
CREATE POLICY "Anyone can read active tax rates" ON public.tax_rates
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins have full access to tax_rates" ON public.tax_rates;
CREATE POLICY "Admins have full access to tax_rates" ON public.tax_rates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.tax_rates (country, province, tax_name, rate, compound, active) VALUES
  ('CA', 'AB', 'GST', 0.0500, false, false),
  ('CA', 'BC', 'GST', 0.0500, false, false),
  ('CA', 'BC', 'PST', 0.0700, false, false),
  ('CA', 'MB', 'GST', 0.0500, false, false),
  ('CA', 'MB', 'PST', 0.0700, false, false),
  ('CA', 'NB', 'HST', 0.1500, false, false),
  ('CA', 'NL', 'HST', 0.1500, false, false),
  ('CA', 'NS', 'HST', 0.1400, false, false),
  ('CA', 'NT', 'GST', 0.0500, false, false),
  ('CA', 'NU', 'GST', 0.0500, false, false),
  ('CA', 'ON', 'HST', 0.1300, false, false),
  ('CA', 'PE', 'HST', 0.1500, false, false),
  ('CA', 'QC', 'GST', 0.0500, false, false),
  ('CA', 'QC', 'QST', 0.09975, false, false),
  ('CA', 'SK', 'GST', 0.0500, false, false),
  ('CA', 'SK', 'PST', 0.0600, false, false),
  ('CA', 'YT', 'GST', 0.0500, false, false)
ON CONFLICT (country, province, tax_name) DO NOTHING;
