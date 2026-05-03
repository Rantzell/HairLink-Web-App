require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTrigger() {
  const sql = `
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

      INSERT INTO public.users (
        id, email, name, first_name, last_name, role, 
        country, region, postal_code, age, gender, phone,
        created_at, updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_first,
        v_last,
        COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
        NEW.raw_user_meta_data->>'country',
        NEW.raw_user_meta_data->>'region',
        NEW.raw_user_meta_data->>'postal_code',
        (NEW.raw_user_meta_data->>'age')::INTEGER,
        NEW.raw_user_meta_data->>'gender',
        NEW.raw_user_meta_data->>'phone',
        NOW(),
        NOW()
      )
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
      RETURN NEW;
    END;
    $$;
  `;
  
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('Successfully updated handle_new_user trigger function.');
  } catch (err) {
    console.error('Failed to update trigger:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateTrigger();
