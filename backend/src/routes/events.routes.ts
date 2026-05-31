import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { eventCreateSchema } from '../schemas';
import { notifyNewEvent } from '../services/notification.service';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['admin', 'staff'];
function requireAdmin(req: Request, res: Response): boolean {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

function serializeEvent(e: any) {
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    description: e.description || '',
    location: e.location || '',
    date: e.date instanceof Date ? e.date.toISOString() : e.date,
    status: e.status || 'Upcoming',
    participantsCount: e.participantsCount ?? 0,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/events
 * Returns { upcomingEvents, pastEvents }.
 * Auth required so the JWT can populate req.user (used elsewhere) but every
 * authenticated user — donor, recipient, staff, admin — sees the same data.
 */
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const [upcoming, past] = await Promise.all([
      prisma.event.findMany({ where: { date: { gte: now } }, orderBy: { date: 'asc' } }),
      prisma.event.findMany({ where: { date: { lt: now } }, orderBy: { date: 'desc' }, take: 20 }),
    ]);
    res.json({
      upcomingEvents: upcoming.map(serializeEvent),
      pastEvents: past.map(serializeEvent),
    });
  } catch (err) {
    console.error('[Events] List error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/next
 * Returns the single closest upcoming event — or `null` if there is none.
 * Same shape as the existing /api/public/events/next so the mobile and web
 * "UPCOMING EVENT" cards can share rendering code.
 */
router.get('/next', authenticate, async (_req: Request, res: Response) => {
  try {
    const next = await prisma.event.findFirst({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });
    res.json(serializeEvent(next));
  } catch (err) {
    console.error('[Events] Next error:', err);
    res.status(500).json({ error: 'Failed to fetch next event' });
  }
});

/**
 * POST /api/events
 * Admin/staff only. Mirrors the field names accepted by the web admin form
 * (event_title / event_date / event_description / event_location) so the
 * same validator is reused.
 */
router.post('/', authenticate, validate(eventCreateSchema), async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const created = await prisma.event.create({
      data: {
        title: req.body.event_title,
        date: new Date(req.body.event_date),
        description: req.body.event_description || '',
        location: req.body.event_location || '',
        status: 'Upcoming',
        participantsCount: 0,
      },
    });
    // Fan out to every active donor + recipient.
    notifyNewEvent(created.title, created.date, created.location).catch((e) =>
      console.error('[Events] Broadcast failed:', e),
    );
    res.status(201).json(serializeEvent(created));
  } catch (err) {
    console.error('[Events] Create error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /api/events/:id
 * Admin/staff only. Partial update — title / date / description / location / status.
 */
const eventUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().max(255).optional(),
  status: z.enum(['Upcoming', 'Completed', 'Cancelled']).optional(),
});

router.patch('/:id', authenticate, validate(eventUpdateSchema), async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(String(idParam), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid event id' });
      return;
    }
    const data: any = { ...req.body };
    if (data.date) data.date = new Date(data.date);

    const updated = await prisma.event.update({ where: { id }, data });
    res.json(serializeEvent(updated));
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    console.error('[Events] Update error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

export default router;
