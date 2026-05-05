import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const taskCode = 'WG-F3A949';
  console.log(`Fixing task ${taskCode} to received status...`);

  const task = await prisma.wigProduction.findUnique({
    where: { taskCode }
  });

  if (!task) {
    console.error('Task not found');
    return;
  }

  // Update wig production status to 'received'
  await prisma.wigProduction.update({
    where: { id: task.id },
    data: { 
      status: 'received'
    }
  });

  console.log('Fix applied successfully.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
