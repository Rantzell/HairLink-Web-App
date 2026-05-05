import { Router } from 'express';
import prisma from '../config/database';

const router = Router();

// GET /api/public/events/next
// Returns the single closest upcoming event
router.get('/events/next', async (_req, res) => {
  try {
    const nextEvent = await prisma.event.findFirst({
      where: {
        date: {
          gte: new Date()
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    res.json(nextEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch next event' });
  }
});

export default router;
