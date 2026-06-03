import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.wigProduction.findMany({
    where: { NOT: { taskCode: { contains: '-W' } } },
    select: { id: true, taskCode: true, status: true },
    orderBy: { id: 'asc' }
  });
  console.log('Parent task codes:');
  rows.forEach(r => console.log(` ID ${r.id}: ${r.taskCode}  [${r.status}]`));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
