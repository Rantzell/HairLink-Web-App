import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../src/config/database';

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USER LIST ---');
  users.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
