import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const donations = await prisma.donation.findMany({
      take: 20,
      orderBy: { id: 'desc' }
    });
    console.log('Recent Donations:');
    donations.forEach(d => {
      console.log(`ID: ${d.id}, Ref: ${d.reference}, Status: ${d.status}, Created: ${d.createdAt}`);
    });

    const requests = await prisma.hairRequest.findMany({
      take: 20,
      orderBy: { id: 'desc' }
    });
    console.log('\nRecent Hair Requests:');
    requests.forEach(r => {
      console.log(`ID: ${r.id}, Ref: ${r.reference}, Status: ${r.status}, Created: ${r.createdAt}`);
    });

    const monetary = await prisma.monetaryDonation.findMany({
      take: 20,
      orderBy: { id: 'desc' }
    });
    console.log('\nRecent Monetary Donations:');
    monetary.forEach(m => {
      console.log(`ID: ${m.id}, RefNum: ${m.referenceNumber}, Status: ${m.status}, Created: ${m.createdAt}`);
    });

    const wigProductions = await prisma.wigProduction.findMany({
      take: 20,
      orderBy: { id: 'desc' }
    });
    console.log('\nRecent Wig Productions:');
    wigProductions.forEach(w => {
      console.log(`ID: ${w.id}, Code: ${w.taskCode}, Status: ${w.status}, Created: ${w.createdAt}`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
