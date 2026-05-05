const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const posts = await prisma.communityPost.findMany({
      include: { user: true }
    });
    console.log('Success! Found', posts.length, 'posts');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
