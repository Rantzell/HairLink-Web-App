import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "status_histories" DROP CONSTRAINT IF EXISTS "fk_status_donation";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "status_histories" DROP CONSTRAINT IF EXISTS "fk_status_request";`);
  console.log("Constraints dropped");
}

main().catch(console.error).finally(() => prisma.$disconnect());
