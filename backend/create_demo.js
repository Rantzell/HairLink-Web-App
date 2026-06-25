require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const email = 'demo100@example.com';
  const password = 'Password123!';

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError && authError.message !== 'User already registered') {
    throw authError;
  }

  let authUserId;
  if (authError && authError.message === 'User already registered') {
    // get user ID
    const { data: listData } = await supabase.auth.admin.listUsers();
    const user = listData.users.find(u => u.email === email);
    authUserId = user.id;
    // ensure password is correct
    await supabase.auth.admin.updateUserById(authUserId, { password });
  } else {
    authUserId = authData.user.id;
  }

  // 2. Upsert in Prisma
  let user = await prisma.user.findUnique({ where: { id: authUserId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: authUserId,
        email: email,
        password: password, // App might use this field or rely solely on Supabase
        firstName: 'Demo',
        lastName: 'Account',
        name: 'Demo Account',
        role: 'donor',
      }
    });
    console.log('Created new donor in DB:', user.email);
  } else {
    console.log('Using existing donor in DB:', user.email);
  }

  // 3. Add 100 stars
  await prisma.donation.deleteMany({ where: { userId: user.id } });
  await prisma.user.updateMany({ where: { referredBy: user.id }, data: { referredBy: null } });
  await prisma.user.update({ where: { id: user.id }, data: { referredBy: null } });

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

  await prisma.donation.createMany({ data: donationsToCreate });
  console.log('--- SUCCESS ---');
  console.log(`Demo account ready!`);
  console.log(`Login: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Stars: 100 (via 10 received hair donations)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
