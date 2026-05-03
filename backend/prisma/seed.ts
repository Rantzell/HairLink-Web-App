import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial users...');

  const hashedPassword = await bcrypt.hash('admin12345', 12);
  const demoPassword = await bcrypt.hash('password123', 12);

  const users = [
    {
      email: 'admin@hairlink.local',
      name: 'System Admin',
      firstName: 'System',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    },
    {
      email: 'donor.demo@hairlink.local',
      name: 'Donor Demo',
      firstName: 'Donor',
      lastName: 'Demo',
      password: demoPassword,
      role: 'donor',
      isActive: true,
    },
    {
      email: 'recipient.demo@hairlink.local',
      name: 'Recipient Demo',
      firstName: 'Recipient',
      lastName: 'Demo',
      password: demoPassword,
      role: 'recipient',
      isActive: true,
    },
    {
      email: 'staff.demo@hairlink.local',
      name: 'Staff Demo',
      firstName: 'Staff',
      lastName: 'Demo',
      password: demoPassword,
      role: 'staff',
      isActive: true,
    },
    {
      email: 'wigmaker.demo@hairlink.local',
      name: 'Wigmaker Demo',
      firstName: 'Wigmaker',
      lastName: 'Demo',
      password: demoPassword,
      role: 'wigmaker',
      isActive: true,
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({ data: u });
      console.log(`Created user: ${u.email}`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
