import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { postCreateSchema, commentCreateSchema } from '../schemas';
import { uploadFile, getPublicUrl } from '../services/storage.service';
import { notifyCommunityInteraction } from '../services/notification.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function serializePost(p: any) {
  return {
    ...p,
    user: p.user ? { ...p.user, id: p.user.id.toString() } : undefined,
    comments: p.comments?.map((c: any) => ({
      ...c,
      user: c.user ? { ...c.user, id: c.user.id.toString() } : undefined,
      replies: c.replies?.map((r: any) => ({ ...r, user: r.user ? { ...r.user, id: r.user.id.toString() } : undefined })),
    })),
  };
}

// GET /internal-api/community/posts
router.get('/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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

    const result = posts.map((p) => {
      try {
        const likesCount = p.likedBy ? p.likedBy.length : 0;
        const isLiked = p.likedBy ? p.likedBy.some((l) => l.userId === userId) : false;
        const { likedBy, ...rest } = p;
        return { ...serializePost(rest), likes: likesCount, is_liked: isLiked };
      } catch (err) {
        console.error(`[Community] Serialization error for post ${p.id}:`, err);
        throw err;
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[Community] Posts error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

// POST /internal-api/community/posts
router.post('/posts', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const content = (req.body.content || '').toString().trim();
    console.log('[Community] Creating post: content=', content, 'file=', req.file ? req.file.originalname : 'none');
    if (!content) { res.status(400).json({ error: 'Caption is required' }); return; }

    let imageUrl: string | null = null;
    if (req.file) {
      const path = await uploadFile(req.file, 'hairlink', 'community/posts');
      imageUrl = getPublicUrl('hairlink', path);
    }

    const post = await prisma.communityPost.create({
      data: {
        id: uuidv4(),
        userId: req.user!.id,
        content,
        imageUrl
      },
      include: { user: true, comments: true },
    });

    res.status(201).json({ ...serializePost(post), likes: 0, is_liked: false });
  } catch (err) {
    console.error('[Community] Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /internal-api/community/posts/:postId/comments
router.post('/posts/:postId/comments', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }

    const content = req.body.content || null;
    const parentId = req.body.parent_id || null;

    let imageUrl: string | null = null;
    if (req.file) {
      const path = await uploadFile(req.file, 'hairlink', 'community/comments');
      imageUrl = getPublicUrl('hairlink', path);
    }

    if (!content && !imageUrl) {
      res.status(400).json({ error: 'Content or image is required' });
      return;
    }

    const comment = await prisma.communityComment.create({
      data: { 
        id: uuidv4(),
        postId, 
        userId: req.user!.id, 
        parentId, 
        content: content || '', 
        imageUrl 
      },
      include: { user: true },
    });

    const actorName = (comment.user as any).firstName
      ? `${(comment.user as any).firstName} ${(comment.user as any).lastName || ''}`.trim()
      : 'Someone';

    if (parentId) {
      // It's a reply — notify the parent comment's author (not the post owner,
      // unless the parent comment happens to be theirs).
      const parent = await prisma.communityComment.findUnique({ where: { id: parentId } });
      if (parent && parent.userId !== req.user!.id) {
        await notifyCommunityInteraction(parent.userId, actorName, postId, 'reply');
      }
    } else if (post.userId !== req.user!.id) {
      // Top-level comment on someone else's post → notify the post owner.
      await notifyCommunityInteraction(post.userId, actorName, postId, 'comment');
    }

    res.status(201).json({ ...comment, user: (comment as any).user ? { ...(comment as any).user, id: (comment as any).user.id.toString() } : undefined });
  } catch (err) {
    console.error('[Community] Create comment error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// POST /internal-api/community/posts/:postId/like
router.post('/posts/:postId/like', authenticate, async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    const existing = await prisma.communityPostLike.findFirst({
      where: { userId, communityPostId: postId },
    });

    let isLiked = false;
    if (existing) {
      await prisma.communityPostLike.delete({ where: { id: existing.id } });
    } else {
      const post = await prisma.communityPost.findUnique({ where: { id: postId }, include: { user: true } });
      await prisma.communityPostLike.create({ data: { id: uuidv4(), userId, communityPostId: postId } });
      isLiked = true;

      // Notify owner
      if (post && post.userId !== userId) {
        const actor = await prisma.user.findUnique({ where: { id: userId } });
        const actorName = actor?.firstName ? `${actor.firstName} ${actor.lastName || ''}`.trim() : 'Someone';
        await notifyCommunityInteraction(post.userId, actorName, postId, 'like');
      }
    }

    const likesCount = await prisma.communityPostLike.count({ where: { communityPostId: postId } });
    res.json({ likes: likesCount, is_liked: isLiked });
  } catch (err) { res.status(500).json({ error: 'Failed to toggle like' }); }
});

// DELETE /internal-api/community/posts/:postId
router.delete('/posts/:postId', authenticate, async (req: Request, res: Response) => {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.postId as string } });
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Unauthorized deletion' }); return;
    }
    await prisma.communityPost.delete({ where: { id: post.id } });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete post' }); }
});

// DELETE /internal-api/community/comments/:commentId
router.delete('/comments/:commentId', authenticate, async (req: Request, res: Response) => {
  try {
    const comment = await prisma.communityComment.findUnique({ where: { id: req.params.commentId as string } });
    if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }
    if (comment.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Unauthorized deletion' }); return;
    }
    await prisma.communityComment.delete({ where: { id: comment.id } });
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete comment' }); }
});

export default router;
