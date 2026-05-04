import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = 'admin@hairlink.local';
  const password = 'admin12345';

  console.log(`Testing login for ${email}...`);
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;
    const token = authData.session?.access_token;
    console.log('✓ Supabase login success');

    const API_URL = 'http://localhost:3001';
    console.log(`Calling backend ${API_URL}/auth/me ...`);

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.ok) {
        const data = await response.json();
        console.log('✓ Backend response:', JSON.stringify(data, null, 2));
    } else {
        const text = await response.text();
        console.error('✗ Backend error:', response.status, text);
    }
  } catch (error: any) {
    console.error('✗ Error:', error.message);
  }
}

main();
