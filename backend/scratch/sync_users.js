require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUsers() {
  console.log('Syncing users from auth.users to public.users...');
  
  try {
    const sql = `
      INSERT INTO public.users (
        id, email, name, first_name, last_name, role, 
        country, region, postal_code, age, gender, phone,
        created_at, updated_at
      )
      SELECT
        au.id,
        au.email,
        COALESCE(
          NULLIF(TRIM(COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(au.raw_user_meta_data->>'last_name', '')), ''),
          au.email
        ) as name,
        COALESCE(au.raw_user_meta_data->>'first_name', '') as first_name,
        COALESCE(au.raw_user_meta_data->>'last_name', '') as last_name,
        COALESCE(au.raw_user_meta_data->>'role', 'donor') as role,
        au.raw_user_meta_data->>'country' as country,
        au.raw_user_meta_data->>'region' as region,
        au.raw_user_meta_data->>'postal_code' as postal_code,
        (au.raw_user_meta_data->>'age')::INTEGER as age,
        au.raw_user_meta_data->>'gender' as gender,
        au.raw_user_meta_data->>'phone' as phone,
        NOW(),
        NOW()
      FROM auth.users au
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        country = EXCLUDED.country,
        region = EXCLUDED.region,
        postal_code = EXCLUDED.postal_code,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    `;
    
    await prisma.$executeRawUnsafe(sql);
    console.log('Successfully synced all users.');
  } catch (err) {
    console.error('Failed to sync users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncUsers();
