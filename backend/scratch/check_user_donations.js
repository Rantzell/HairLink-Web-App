const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userId = 'e2071728-9a64-4bda-9341-a9fb370c426a';
    const hair = await prisma.donation.findMany({ where: { userId } });
    const mon = await prisma.monetaryDonation.findMany({ where: { userId } });
    
    console.log('User Hair Donations:', hair.length, hair.map(d => d.status));
    console.log('User Monetary Donations:', mon.length, mon.map(d => d.amount));
    
    const monetary = await prisma.monetaryDonation.aggregate({
      where: { userId, status: { in: ['Submitted', 'Completed'] } },
      _sum: { amount: true }
    });
    console.log('Aggregate Sum:', monetary._sum.amount);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
