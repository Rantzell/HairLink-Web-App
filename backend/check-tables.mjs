import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Show all wig productions (parent batches)
const parents = await p.wigProduction.findMany({
  where: { NOT: { taskCode: { contains: '-W' } } },
  orderBy: { createdAt: 'desc' }
});
console.log('=== PARENT BATCHES ===');
for (const b of parents) {
  console.log(`id=${b.id} taskCode="${b.taskCode}" status=${b.status}`);
}

// Show all child wigs
const children = await p.wigProduction.findMany({
  where: { taskCode: { contains: '-W' } },
  orderBy: { taskCode: 'asc' }
});
console.log('\n=== CHILD WIGS ===');
for (const w of children) {
  console.log(`id=${w.id} taskCode="${w.taskCode}" status=${w.status}`);
}

// Show donations with wigProductionId
const dons = await p.donation.findMany({
  where: { wigProductionId: { not: null } },
  select: { id: true, reference: true, status: true, wigProductionId: true }
});
console.log('\n=== BATCHED DONATIONS ===');
for (const d of dons) {
  console.log(`donId=${d.id} ref=${d.reference} status=${d.status} wpId=${d.wigProductionId}`);
}

await p.$disconnect();
