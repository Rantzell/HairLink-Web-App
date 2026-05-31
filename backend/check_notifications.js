require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const staffUsers = await prisma.user.findMany({
    where: { role: 'staff' }
  });
  console.log('Staff Users found:', staffUsers.length);
  for (const s of staffUsers) {
    const notifs = await prisma.notifications.findMany({
      where: { user_id: s.id }
    });
    console.log(`Staff User: ${s.firstName} ${s.lastName} (ID: ${s.id})`);
    console.log(`- Total notifications: ${notifs.length}`);
    notifs.forEach(n => {
      console.log(`  * Notif ID: ${n.id}, Title: ${n.title}, Type: ${n.type}, IsRead: ${n.is_read}`);
    });
  }

  const allAnnouncements = await prisma.haircareArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('\nRecent CMS Announcements/Articles:');
  allAnnouncements.forEach(a => {
    console.log(`- Title: ${a.title}, Category: ${a.category}, CreatedAt: ${a.createdAt}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
