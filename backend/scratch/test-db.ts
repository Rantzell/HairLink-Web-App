import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing DB connection...');
    const count = await prisma.user.count();
    console.log('Successfully connected to DB. User count:', count);
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
