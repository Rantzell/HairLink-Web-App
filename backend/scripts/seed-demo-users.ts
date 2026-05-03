/**
 * seed-demo-users.ts
 * One-time script: creates all 5 demo accounts in Supabase Auth.
 * The on_auth_user_created trigger will auto-populate public.users.
 *
 * Run from backend/ directory:
 *   npx ts-node scripts/seed-demo-users.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS
);

const demoUsers = [
  {
    email: 'admin@hairlink.local',
    password: 'admin12345',
    user_metadata: { first_name: 'System', last_name: 'Admin', role: 'admin' },
  },
  {
    email: 'donor.demo@hairlink.local',
    password: 'donor12345',
    user_metadata: { first_name: 'Donor', last_name: 'Demo', role: 'donor' },
  },
  {
    email: 'recipient.demo@hairlink.local',
    password: 'recipient12345',
    user_metadata: { first_name: 'Recipient', last_name: 'Demo', role: 'recipient' },
  },
  {
    email: 'staff.demo@hairlink.local',
    password: 'staff12345',
    user_metadata: { first_name: 'Staff', last_name: 'Demo', role: 'staff' },
  },
  {
    email: 'wigmaker.demo@hairlink.local',
    password: 'wigmaker12345',
    user_metadata: { first_name: 'Wigmaker', last_name: 'Demo', role: 'wigmaker' },
  },
];

async function main() {
  console.log('Seeding demo users into Supabase Auth...\n');

  for (const user of demoUsers) {
    // Check if already exists in auth
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.find((u) => u.email === user.email);

    if (alreadyExists) {
      console.log(`⏭  Already exists: ${user.email} (${alreadyExists.id})`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // skip OTP requirement for demo accounts
      user_metadata: user.user_metadata,
    });

    if (error) {
      console.error(`✗ Failed: ${user.email}`, error.message);
    } else {
      console.log(`✓ Created: ${user.email} → ${data.user.id}`);
    }
  }

  console.log('\nDone. The on_auth_user_created trigger has populated public.users for each new user.');
}

main().catch(console.error);
