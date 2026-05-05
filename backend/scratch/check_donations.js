const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const donations = await prisma.monetaryDonation.findMany({
      include: { user: true }
    });
    console.log('Monetary Donations:', JSON.stringify(donations, null, 2));
    
    const stats = await prisma.donation.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('Donation Stats by Status:', stats);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
