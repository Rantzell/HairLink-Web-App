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
-- ==============================================================
-- HairLink – Auth Migration v3 (IDEMPOTENT / SAFE TO RE-RUN)
-- The previous run completed structure changes but failed on data.
-- This version handles the partial state and fixes the name column.
-- ==============================================================


-- ==============================================================
-- STEP 1 – Drop remaining FKs (idempotent)
-- ==============================================================
ALTER TABLE IF EXISTS donations            DROP CONSTRAINT IF EXISTS donations_user_id_fkey;
ALTER TABLE IF EXISTS donations            DROP CONSTRAINT IF EXISTS donations_donor_id_foreign;
ALTER TABLE IF EXISTS hair_requests        DROP CONSTRAINT IF EXISTS hair_requests_user_id_fkey;
ALTER TABLE IF EXISTS hair_requests        DROP CONSTRAINT IF EXISTS hair_requests_user_id_foreign;
ALTER TABLE IF EXISTS monetary_donations   DROP CONSTRAINT IF EXISTS monetary_donations_user_id_fkey;
ALTER TABLE IF EXISTS monetary_donations   DROP CONSTRAINT IF EXISTS monetary_donations_user_id_foreign;
ALTER TABLE IF EXISTS notifications        DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS notifications        DROP CONSTRAINT IF EXISTS notifications_user_id_foreign;
ALTER TABLE IF EXISTS community_posts      DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey;
ALTER TABLE IF EXISTS community_posts      DROP CONSTRAINT IF EXISTS community_posts_user_id_foreign;
ALTER TABLE IF EXISTS community_comments   DROP CONSTRAINT IF EXISTS community_comments_user_id_fkey;
ALTER TABLE IF EXISTS community_comments   DROP CONSTRAINT IF EXISTS community_comments_user_id_foreign;
ALTER TABLE IF EXISTS community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_user_id_fkey;
ALTER TABLE IF EXISTS community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_user_id_foreign;
ALTER TABLE IF EXISTS wig_productions      DROP CONSTRAINT IF EXISTS wig_productions_wigmaker_id_fkey;
ALTER TABLE IF EXISTS wig_productions      DROP CONSTRAINT IF EXISTS wig_productions_wigmaker_id_foreign;


-- ==============================================================
-- STEP 2 – Truncate all data (idempotent)
-- ==============================================================
TRUNCATE TABLE wig_productions      CASCADE;
TRUNCATE TABLE community_post_likes CASCADE;
TRUNCATE TABLE community_comments   CASCADE;
TRUNCATE TABLE community_posts      CASCADE;
TRUNCATE TABLE monetary_donations   CASCADE;
TRUNCATE TABLE hair_requests        CASCADE;
TRUNCATE TABLE donations            CASCADE;
TRUNCATE TABLE public.users         CASCADE;


-- ==============================================================
-- STEP 3 – Restructure public.users (idempotent via DO blocks)
-- ==============================================================

-- Drop legacy columns that are no longer needed (Supabase handles auth)
ALTER TABLE public.users DROP COLUMN IF EXISTS password;
ALTER TABLE public.users DROP COLUMN IF EXISTS remember_token;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_verified_at_old;

-- Remove old integer id column if it still exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS id_old;
ALTER TABLE public.users DROP COLUMN IF EXISTS id;

-- Add UUID primary key
ALTER TABLE public.users
  ADD COLUMN id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE;

-- Other columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'donor';
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'donor', 'recipient', 'staff', 'wigmaker'));

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON public.users(role);


-- ==============================================================
-- STEP 4 – Create trigger for future signups
-- ==============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first   TEXT;
  v_last    TEXT;
  v_name    TEXT;
BEGIN
  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last  := COALESCE(NEW.raw_user_meta_data->>'last_name',  '');
  v_name  := NULLIF(TRIM(v_first || ' ' || v_last), '');
  IF v_name IS NULL THEN v_name := NEW.email; END IF;

  INSERT INTO public.users (id, email, name, first_name, last_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_first,
    v_last,
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================
-- STEP 5 – Re-populate public.users from existing auth.users
--           (includes the 5 seeded demo accounts)
-- ==============================================================

INSERT INTO public.users (id, email, name, first_name, last_name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  -- Compute name: "First Last", falling back to email if both are blank
  COALESCE(
    NULLIF(
      TRIM(
        COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(au.raw_user_meta_data->>'last_name',  '')
      ), ' '
    ),
    au.email
  )                                                           AS name,
  COALESCE(au.raw_user_meta_data->>'first_name', '')         AS first_name,
  COALESCE(au.raw_user_meta_data->>'last_name',  '')         AS last_name,
  COALESCE(au.raw_user_meta_data->>'role',       'donor')    AS role,
  NOW()                                                       AS created_at,
  NOW()                                                       AS updated_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;


-- ==============================================================
-- STEP 6 – Convert FK columns to UUID type
-- ==============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='donations' AND column_name='user_id') THEN
    ALTER TABLE donations ALTER COLUMN user_id TYPE UUID USING NULL;
    ALTER TABLE donations ADD CONSTRAINT donations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='donations' AND column_name='donor_id') THEN
    ALTER TABLE donations ALTER COLUMN donor_id TYPE UUID USING NULL;
    ALTER TABLE donations ADD CONSTRAINT donations_donor_id_fkey
      FOREIGN KEY (donor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE hair_requests ALTER COLUMN user_id TYPE UUID USING NULL;
ALTER TABLE hair_requests ADD CONSTRAINT hair_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE monetary_donations ALTER COLUMN user_id TYPE UUID USING NULL;
ALTER TABLE monetary_donations ADD CONSTRAINT monetary_donations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE notifications ALTER COLUMN user_id TYPE UUID USING NULL;
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE community_posts ALTER COLUMN user_id TYPE UUID USING NULL;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE community_comments ALTER COLUMN user_id TYPE UUID USING NULL;
ALTER TABLE community_comments ADD CONSTRAINT community_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE community_post_likes ALTER COLUMN user_id TYPE UUID USING NULL;
ALTER TABLE community_post_likes ADD CONSTRAINT community_post_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE wig_productions ALTER COLUMN wigmaker_id TYPE UUID USING NULL;
ALTER TABLE wig_productions ADD CONSTRAINT wig_productions_wigmaker_id_fkey
  FOREIGN KEY (wigmaker_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ==============================================================
-- STEP 7 – RLS policies
-- ==============================================================

-- public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own profile"  ON public.users;
DROP POLICY IF EXISTS "users update own profile" ON public.users;
DROP POLICY IF EXISTS "staff read all profiles"  ON public.users;
CREATE POLICY "users read own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "staff read all profiles"
  ON public.users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- hair_requests
ALTER TABLE hair_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donors see own requests"  ON hair_requests;
DROP POLICY IF EXISTS "donors insert own requests" ON hair_requests;
DROP POLICY IF EXISTS "staff see all requests"   ON hair_requests;
CREATE POLICY "donors see own requests"
  ON hair_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "donors insert own requests"
  ON hair_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff see all requests"
  ON hair_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donors see own donations"   ON donations;
DROP POLICY IF EXISTS "donors insert own donations" ON donations;
DROP POLICY IF EXISTS "staff see all donations"    ON donations;
CREATE POLICY "donors see own donations"
  ON donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "donors insert own donations"
  ON donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff see all donations"
  ON donations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- monetary_donations
ALTER TABLE monetary_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see own monetary donations"    ON monetary_donations;
DROP POLICY IF EXISTS "users insert own monetary donations" ON monetary_donations;
DROP POLICY IF EXISTS "staff see all monetary donations"   ON monetary_donations;
CREATE POLICY "users see own monetary donations"
  ON monetary_donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own monetary donations"
  ON monetary_donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff see all monetary donations"
  ON monetary_donations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- community_posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated users can read posts" ON community_posts;
DROP POLICY IF EXISTS "users manage own posts"             ON community_posts;
CREATE POLICY "authenticated users can read posts"
  ON community_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users manage own posts"
  ON community_posts FOR ALL USING (auth.uid() = user_id);

-- community_comments
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated users can read comments" ON community_comments;
DROP POLICY IF EXISTS "users manage own comments"              ON community_comments;
CREATE POLICY "authenticated users can read comments"
  ON community_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users manage own comments"
  ON community_comments FOR ALL USING (auth.uid() = user_id);

-- community_post_likes
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own likes" ON community_post_likes;
CREATE POLICY "users manage own likes"
  ON community_post_likes FOR ALL USING (auth.uid() = user_id);

-- wig_productions
ALTER TABLE wig_productions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wigmakers see own tasks"     ON wig_productions;
DROP POLICY IF EXISTS "staff manage wig productions" ON wig_productions;
CREATE POLICY "wigmakers see own tasks"
  ON wig_productions FOR SELECT USING (auth.uid() = wigmaker_id);
CREATE POLICY "staff manage wig productions"
  ON wig_productions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- events (wrapped in DO block in case table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='events' AND table_schema='public') THEN
    EXECUTE 'ALTER TABLE events ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "everyone can read events" ON events';
    EXECUTE 'DROP POLICY IF EXISTS "staff manage events" ON events';
    EXECUTE 'CREATE POLICY "everyone can read events" ON events FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "staff manage events" ON events FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN (''admin'',''staff'')))';
  END IF;
END $$;

-- partnerships (wrapped in DO block in case table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='partnerships' AND table_schema='public') THEN
    EXECUTE 'ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "everyone can read partnerships" ON partnerships';
    EXECUTE 'DROP POLICY IF EXISTS "admin manages partnerships" ON partnerships';
    EXECUTE 'CREATE POLICY "everyone can read partnerships" ON partnerships FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "admin manages partnerships" ON partnerships FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ''admin''))';
  END IF;
END $$;

-- ==============================================================
-- Done! Run: SELECT id, email, name, role FROM public.users;
-- to verify the 5 demo accounts are present.
-- ==============================================================
-- Insert auth.users into public.users, normalizing role to lowercase
INSERT INTO public.users (id, email, name, first_name, last_name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(
      TRIM(
        COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(au.raw_user_meta_data->>'last_name',  '')
      ), ' '
    ),
    au.email
  ) AS name,
  COALESCE(au.raw_user_meta_data->>'first_name', '') AS first_name,
  COALESCE(au.raw_user_meta_data->>'last_name',  '') AS last_name,
  -- normalize role to lowercase and default to 'donor'
  COALESCE(lower(au.raw_user_meta_data->>'role'), 'donor') AS role,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users au
ON CONFLICT (id) DO NOTHING;
