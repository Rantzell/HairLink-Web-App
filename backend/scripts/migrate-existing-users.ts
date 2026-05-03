/**
 * migrate-existing-users.ts
 * One-time script: invites real users (genesisvince14@gmail.com, etc.)
 * who are in public.users but NOT yet in Supabase Auth.
 * They will receive a magic link email to set their own password.
 *
 * Run from backend/ directory:
 *   npx ts-node scripts/migrate-existing-users.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Fetching users from public.users...\n');

  // Get all users from public.users
  const { data: publicUsers, error: fetchError } = await supabase
    .from('users')
    .select('email, first_name, last_name, role');

  if (fetchError) {
    console.error('Failed to fetch public.users:', fetchError.message);
    process.exit(1);
  }

  // Get all existing auth users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authEmails = new Set(authData?.users?.map((u) => u.email?.toLowerCase()));

  console.log(`Found ${publicUsers?.length ?? 0} public users, ${authEmails.size} auth users.\n`);

  for (const u of publicUsers ?? []) {
    if (authEmails.has(u.email?.toLowerCase())) {
      console.log(`⏭  Already in auth: ${u.email}`);
      continue;
    }

    // Skip .local demo accounts — those are handled by seed-demo-users.ts
    if (u.email?.endsWith('@hairlink.local')) {
      console.log(`⏭  Demo account (skip): ${u.email}`);
      continue;
    }

    const { error } = await supabase.auth.admin.inviteUserByEmail(u.email, {
      data: {
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
      },
    });

    if (error) {
      console.error(`✗ Failed to invite: ${u.email} —`, error.message);
    } else {
      console.log(`✓ Invited: ${u.email} (will receive magic link)`);
    }
  }

  console.log('\nMigration complete.');
}

main().catch(console.error);
