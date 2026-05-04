import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prisma = new PrismaClient();

async function main() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  console.log(`Creating test user: ${testEmail}`);
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { first_name: 'Test', last_name: 'Trigger', role: 'donor' }
    });

    if (authError) throw authError;
    const userId = authData.user.id;
    console.log(`✓ Auth user created: ${userId}`);

    console.log('Waiting 2 seconds for trigger to fire...');
    await new Promise(r => setTimeout(r, 2000));

    const profile = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (profile) {
      console.log('✓ Trigger SUCCESS: Profile found in public.users');
    } else {
      console.log('✗ Trigger FAILED: Profile not found in public.users');
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(userId);
    console.log('Test user cleaned up.');

  } catch (error: any) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
