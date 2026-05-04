import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const demoEmails = [
    'admin@hairlink.local',
    'donor.demo@hairlink.local',
    'recipient.demo@hairlink.local',
    'staff.demo@hairlink.local',
    'wigmaker.demo@hairlink.local'
  ];

  try {
    for (const email of demoEmails) {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      if (user) {
        console.log(`✓ Found: ${email} (ID: ${user.id}, Role: ${user.role})`);
      } else {
        console.log(`✗ Missing: ${email}`);
      }
    }
  } catch (error: any) {
    console.error('Error checking demo users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
