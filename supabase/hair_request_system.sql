-- ─── HAIR REQUEST & NOTIFICATION SYSTEM FIX ───────────────────────────
-- Run this entire script in your Supabase SQL Editor to fix submission issues.

-- 1. Ensure Table Exists with Correct Types
CREATE TABLE IF NOT EXISTS public.hair_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  story TEXT NOT NULL,
  hair_length TEXT NOT NULL,
  wig_color TEXT NOT NULL,
  document_path TEXT, 
  reference_path TEXT, 
  survey_source TEXT[],
  permissions TEXT[],
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure Notifications Table Exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.hair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Hair Request Policies
DROP POLICY IF EXISTS "Users can insert their own requests" ON public.hair_requests;
CREATE POLICY "Users can insert their own requests" 
  ON public.hair_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own requests" ON public.hair_requests;
CREATE POLICY "Users can view their own requests" 
  ON public.hair_requests FOR SELECT 
  USING (auth.uid() = user_id);

-- 5. Notification Policies (CRITICAL: Allows client-side inserts)
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

-- 6. STORAGE BUCKET POLICIES (Fixes Image Upload Failures)
-- NOTE: Please make sure you have created a bucket named "hair-requests" in the Supabase Storage dashboard.

-- Allow authenticated users to upload to "hair-requests"
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hair-requests');

    DROP POLICY IF EXISTS "Allow authenticated selects" ON storage.objects;
    CREATE POLICY "Allow authenticated selects" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'hair-requests');
END $$;
