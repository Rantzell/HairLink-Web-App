require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function main() {
  let user = await prisma.user.findFirst({ where: { email: 'demo100@example.com' } });
  if (!user) {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'demo100@example.com',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'Account',
        name: 'Demo Account',
        role: 'donor',
      }
    });
    console.log('Created new donor:', user.email);
  } else {
    console.log('Using existing donor:', user.email);
  }
  
  // Clear existing donations and referrals to ensure exactly 100 points
  await prisma.donation.deleteMany({ where: { userId: user.id } });
  await prisma.user.updateMany({ where: { referredBy: user.id }, data: { referredBy: null } });
  await prisma.user.update({ where: { id: user.id }, data: { referredBy: null } });

  // Create 10 'Received Hair' donations (10 * 10 = 100 points)
  const donationsToCreate = Array.from({ length: 10 }).map((_, i) => ({
    userId: user.id,
    status: 'Received Hair',
    reference: `DEMO-HAIR-${Date.now()}-${i}`,
    hairLength: '12 inches',
    hairColor: 'Black',
    treatedHair: false,
    address: 'Demo Address',
    reason: 'Demo',
    dropoffLocation: 'Demo Dropoff'
  }));

  for (const d of donationsToCreate) {
    await prisma.donation.create({ data: d });
  }
  console.log('Created 10 hair donations. The user now has exactly 100 stars!');
  console.log(`Login with: ${user.email}`);
  console.log(`Password: Password123!`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
