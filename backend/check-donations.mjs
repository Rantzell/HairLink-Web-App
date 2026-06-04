import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.donation.findMany({ select: { id: true, status: true } });
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
