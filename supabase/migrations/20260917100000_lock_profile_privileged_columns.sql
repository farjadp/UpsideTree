-- Customers could promote themselves to ADMIN: the "update their own profile"
-- policy had no WITH CHECK and no column limit, so a signed-in user could
-- PATCH customer_profiles.role = 'ADMIN' straight through PostgREST.
--
-- RLS can't restrict individual columns, so a trigger rejects changes to
-- privileged columns unless the caller is an admin or the service role.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.customer_profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- No user JWT (migrations, dashboard SQL), the service role, or an admin.
  -- anon can't reach this: the UPDATE policy requires auth.uid() = id.
  IF auth.uid() IS NULL
     OR coalesce(auth.role(), '') = 'service_role'
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
     OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Not allowed to change protected profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.customer_profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

DROP POLICY IF EXISTS "Users can update their own profile." ON public.customer_profiles;
CREATE POLICY "Users can update their own profile."
  ON public.customer_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
