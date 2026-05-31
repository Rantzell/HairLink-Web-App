-- migration_prelude.sql
-- Drop possibly-existing RLS policies that reference public.users.id so the
-- main migration script can alter the users table safely.

-- Drop policies on public.users
DROP POLICY IF EXISTS "users read own profile" ON public.users;
DROP POLICY IF EXISTS "users update own profile" ON public.users;
DROP POLICY IF EXISTS "staff read all profiles" ON public.users;

-- Drop policies that might reference public.users in other tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hair_requests') THEN
    DROP POLICY IF EXISTS "staff see all requests" ON public.hair_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='donations') THEN
    DROP POLICY IF EXISTS "staff see all donations" ON public.donations;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monetary_donations') THEN
    DROP POLICY IF EXISTS "staff see all monetary donations" ON public.monetary_donations;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wig_productions') THEN
    DROP POLICY IF EXISTS "staff manage wig productions" ON public.wig_productions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') THEN
    DROP POLICY IF EXISTS "staff manage events" ON public.events;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='partnerships') THEN
    DROP POLICY IF EXISTS "admin manages partnerships" ON public.partnerships;
  END IF;
END $$;
