import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const taskCode = 'WG-F3A949';
  console.log(`Fixing task ${taskCode}...`);

  const task = await prisma.wigProduction.findUnique({
    where: { taskCode }
  });

  if (!task) {
    console.error('Task not found');
    return;
  }

  // 1. Update task to 'assigned' and set isReceived to true
  await prisma.wigProduction.update({
    where: { id: task.id },
    data: { 
      status: 'assigned',
      isReceived: true 
    }
  });

  // 2. Update status history entries
  // Any entry that is 'processing' for this task should probably be 'assigned' if it was the receipt confirmation
  await prisma.statusHistory.updateMany({
    where: {
      trackableId: task.id,
      trackableType: 'App\\Models\\WigProduction',
      status: 'processing'
    },
    data: {
      status: 'assigned'
    }
  });

  console.log('Fix applied successfully.');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
