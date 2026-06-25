-- ==============================================================
-- HairLink – Drop Laravel Legacy Tables
-- Safe to run: none of these tables are used by the Node/Express
-- backend, the React web frontend, or the React Native mobile app.
-- Run this in the Supabase SQL Editor.
-- ==============================================================

DROP TABLE IF EXISTS public.personal_access_tokens CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens   CASCADE;
DROP TABLE IF EXISTS public.sessions                CASCADE;
DROP TABLE IF EXISTS public.failed_jobs             CASCADE;
DROP TABLE IF EXISTS public.job_batches             CASCADE;
DROP TABLE IF EXISTS public.jobs                    CASCADE;
DROP TABLE IF EXISTS public.migrations              CASCADE;
DROP TABLE IF EXISTS public.cache_locks             CASCADE;
DROP TABLE IF EXISTS public.cache                   CASCADE;

-- Verify: the following query should return 0 rows
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'personal_access_tokens','password_reset_tokens','sessions',
--     'failed_jobs','job_batches','jobs','migrations','cache_locks','cache'
--   );
