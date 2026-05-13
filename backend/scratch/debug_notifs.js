const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.notifications.count();
  console.log('Total notifications:', count);
  const latest = await prisma.notifications.findMany({ take: 5, orderBy: { created_at: 'desc' } });
  console.log('Latest 5:', JSON.stringify(latest, null, 2));
  process.exit(0);
}

check();
