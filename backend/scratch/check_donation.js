const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function check() {
  const ref = 'HD-343669841';
  const d = await prisma.donation.findFirst({ where: { reference: ref } });
  console.log('Donation:', JSON.stringify(d, null, 2));
  process.exit(0);
}

check();
