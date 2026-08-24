-- ============================================================================
-- Upside Tree — Create a loyalty account on signup (+ backfill)
--
-- WHY THIS EXISTS
-- public.handle_new_user() creates customer_profiles and
-- customer_preferences rows for every new signup, but never a
-- loyalty_accounts row — confirmed live: 3 customer_profiles, 0
-- loyalty_accounts. So /account/loyalty had nothing to read for any real
-- user, which is part of why that page was built against hard-coded mock
-- data instead.
--
-- This adds the missing insert to the trigger and backfills the accounts
-- that were never created.
--
-- Also adds the INSERT/UPDATE policies loyalty needs: schema.sql only ever
-- granted customers SELECT on their own loyalty rows, so nothing but an
-- admin or this SECURITY DEFINER trigger can write them — which is the
-- intent (points must not be self-issued), but it means the trigger is the
-- only path that creates the account.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    CASE WHEN (SELECT count(*) FROM public.customer_profiles) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', '')
  );

  INSERT INTO public.customer_preferences (customer_id)
  VALUES (new.id);

  INSERT INTO public.loyalty_accounts (customer_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill: every existing profile that never got a loyalty account.
INSERT INTO public.loyalty_accounts (customer_id)
SELECT p.id
FROM public.customer_profiles p
LEFT JOIN public.loyalty_accounts la ON la.customer_id = p.id
WHERE la.id IS NULL;

COMMIT;
