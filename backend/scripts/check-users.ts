import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users in public.users: ${userCount}`);
    
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, email: true, role: true }
    });
    console.log('Sample users:', JSON.stringify(users, null, 2));
  } catch (error: any) {
    console.error('Error checking users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
