import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

function s(o: any): any {
  if (o === null || o === undefined) return o;
  if (typeof o === 'bigint') return o.toString();
  if (typeof o === 'object' && o.d && typeof o.toFixed === 'function') return o.toString();
  if (o instanceof Date) return o;
  if (Array.isArray(o)) return o.map(s);
  if (typeof o === 'object') {
    const r: any = {};
    for (const k of Object.keys(o)) { r[k] = s(o[k]); }
    return r;
  }
  return o;
}

// GET /internal-api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.notifications.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
    });
    res.json(s(items));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// PUT /internal-api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notifications.updateMany({
      where: { user_id: req.user!.id, is_read: false },
      data: { is_read: true },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// PUT /internal-api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    await prisma.notifications.updateMany({
      where: { id, user_id: req.user!.id },
      data: { is_read: true },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// DELETE /internal-api/notifications/clear-all
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    await prisma.notifications.deleteMany({
      where: { user_id: req.user!.id },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// DELETE /internal-api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    await prisma.notifications.deleteMany({
      where: { id, user_id: req.user!.id },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

export default router;
