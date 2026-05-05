const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userId = 'e2071728-9a64-4bda-9341-a9fb370c426a';
    const posts = await prisma.communityPost.findMany({
      include: {
        user: true,
        comments: {
          where: { parentId: null },
          include: {
            user: true,
            replies: { include: { user: true }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
        likedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('Posts fetched:', posts.length);
    
    const serializePost = (p) => {
      return {
        ...p,
        user: p.user ? { ...p.user, id: p.user.id.toString() } : undefined,
        comments: p.comments?.map((c) => ({
          ...c,
          user: c.user ? { ...c.user, id: c.user.id.toString() } : undefined,
          replies: c.replies?.map((r) => ({ ...r, user: r.user ? { ...r.user, id: r.user.id.toString() } : undefined })),
        })),
      };
    }

    const result = posts.map((p) => {
      const likesCount = p.likedBy ? p.likedBy.length : 0;
      const isLiked = p.likedBy ? p.likedBy.some((l) => l.userId === userId) : false;
      const { likedBy, ...rest } = p;
      return { ...serializePost(rest), likes: likesCount, is_liked: isLiked };
    });
    
    console.log('Serialization successful');
  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
