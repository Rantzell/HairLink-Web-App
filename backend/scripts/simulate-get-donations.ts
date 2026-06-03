import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const DONATION_TYPE = 'App\\Models\\Donation';

function serializeDonation(d: any) {
  return { 
    ...d, 
    id: d.id.toString(), 
    userId: d.userId?.toString() || null, 
    user: d.user ? { ...d.user, id: d.user.id.toString() } : undefined 
  };
}

async function getStatusHistories(trackableType: string, trackableId: string | number) {
  return prisma.statusHistory.findMany({
    where: { trackableType, trackableId: Number(trackableId) },
    orderBy: { createdAt: 'desc' },
  });
}

async function main() {
  try {
    const userId = 'e2071728-9a64-4bda-9341-a9fb370c426a';
    console.log('Fetching donations for user:', userId);
    const donations = await prisma.donation.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('Found donations:', donations.length);
    
    const result = await Promise.all(donations.map(async (d) => {
      const statusHistories = await getStatusHistories(DONATION_TYPE, d.id);
      return { ...serializeDonation(d), statusHistories };
    }));
    
    console.log('Successfully serialized donations. First item:', result[0]);
  } catch (error: any) {
    console.error('Error simulating GET /internal-api/donations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
