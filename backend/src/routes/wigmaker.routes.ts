import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { taskUpdateSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile } from '../services/storage.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const wmOnly = [authenticate, requireRole('wigmaker')];
const WIG_TYPE = 'App\\Models\\WigProduction' as const;
const DON_TYPE = 'App\\Models\\Donation' as const;

function s(o: any): any {
  if (o === null || o === undefined) return o;
  if (typeof o === 'bigint') return o.toString();
  if (o instanceof Date) return o;
  if (Array.isArray(o)) return o.map(s);
  if (typeof o === 'object') { const r: any = {}; for (const k of Object.keys(o)) r[k] = s(o[k]); return r; }
  return o;
}

// GET /internal-api/wigmaker/dashboard
router.get('/dashboard', ...wmOnly, async (req, res) => {
  try {
    const tasks = await prisma.wigProduction.findMany({ where: { wigmakerId: req.user!.id }, include: { donation: true } });
    res.json(s(tasks));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/wigmaker/tasks
router.get('/tasks', ...wmOnly, async (req, res) => {
  try {
    const tasks = await prisma.wigProduction.findMany({ where: { wigmakerId: req.user!.id }, include: { donation: true }, orderBy: { updatedAt: 'desc' } });
    const q = tasks.filter(t => t.status === 'assigned').length;
    const p = tasks.filter(t => t.status === 'processing').length;
    const c = tasks.filter(t => t.status === 'completed').length;
    res.json({ tasks: s(tasks), queuedCount: q, inProgressCount: p, completedCount: c });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/wigmaker/tasks/:taskCode
router.get('/tasks/:taskCode', ...wmOnly, async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({ where: { taskCode: req.params.taskCode }, include: { donation: true } });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }
    const histories = await getStatusHistories(WIG_TYPE, task.id, true);
    res.json({ task: s(task), histories: s(histories) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/wigmaker/tasks/:taskCode
router.post('/tasks/:taskCode', ...wmOnly, upload.single('previewPhoto'), validate(taskUpdateSchema), async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({ where: { taskCode: req.params.taskCode, wigmakerId: req.user!.id } });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }

    const { status, progressNotes, updatedAt, deliveryLink } = req.body;
    const updateData: any = { status };
    if (deliveryLink) updateData.deliveryLink = deliveryLink;
    await prisma.wigProduction.update({ where: { id: task.id }, data: updateData });

    // Handle photo metadata
    const metadata: Record<string, any> = {};
    if (req.file) {
      const path = await uploadFile(req.file, 'hairlink', 'production/previews');
      metadata.preview_photo = path;
    }

    const history = await createStatusHistory(WIG_TYPE, task.id, status, progressNotes, Object.keys(metadata).length ? metadata : null);
    if (updatedAt) {
      await prisma.statusHistory.update({ where: { id: history.id }, data: { createdAt: new Date(updatedAt) } });
    }

    // Sync linked donation status
    if (task.donationId) {
      const statusMap: Record<string, string> = { assigned: 'In Queue', processing: 'In Progress', completed: 'Completed' };
      const newDonStatus = statusMap[status];
      if (newDonStatus) {
        const don = await prisma.donation.findUnique({ where: { id: task.donationId } });
        if (don && don.status !== newDonStatus) {
          await prisma.donation.update({ where: { id: don.id }, data: { status: newDonStatus } });
          await createStatusHistory(DON_TYPE, don.id, newDonStatus, progressNotes);
        }
      }
    }

    res.json({ message: 'Task updated successfully and synced with tracking.', success: true, delivery_link: updateData.deliveryLink || task.deliveryLink });
  } catch (err) {
    console.error('[Wigmaker] Task update error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
