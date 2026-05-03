/**
 * prisma/seed.ts
 *
 * Auth seeding is now handled by Supabase Auth (not local bcrypt).
 * Run the following one-time scripts instead:
 *
 *   npx ts-node scripts/seed-demo-users.ts       — creates demo accounts in auth.users
 *   npx ts-node scripts/migrate-existing-users.ts — invites real users via magic link
 *
 * This file is intentionally left as a no-op to avoid accidental overwrites.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Prisma seed: No local password seeding needed.');
  console.log('Run `npx ts-node scripts/seed-demo-users.ts` to seed demo auth accounts.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
