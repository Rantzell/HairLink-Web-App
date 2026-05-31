import { Router } from 'express';
import prisma from '../config/database';

const router = Router();

// GET /api/public/events/next
// Returns the single closest upcoming event
router.get('/events/next', async (_req, res) => {
  try {
    const nextEvent = await prisma.event.findFirst({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' }
    });
    res.json(nextEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch next event' });
  }
});

// GET /api/public/events/upcoming
// Returns the nearest event + the next 3 after it (sorted by date, future only)
router.get('/events/upcoming', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 4,
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// GET /api/public/site-settings
// Returns all site settings as a flat { key: value } map — no auth required
router.get('/site-settings', async (_req, res) => {
  try {
    const rows = await (prisma as any).siteSetting.findMany();
    const map: Record<string, any> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

export default router;
