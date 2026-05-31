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
