import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { taskUpdateSchema, materialConfirmationSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile } from '../services/storage.service';
import { notifyDonationStatus, notifyStaffWigmakerCompletedWig, notifyStaffWigmakerReceivedMaterial } from '../services/notification.service';

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
    const tasks = await prisma.wigProduction.findMany({ where: { wigmakerId: req.user!.id }, include: { donations: true } as any });
    res.json(s(tasks));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/wigmaker/tasks
router.get('/tasks', ...wmOnly, async (req, res) => {
  try {
    const tasks = await prisma.wigProduction.findMany({ where: { wigmakerId: req.user!.id }, include: { donations: true } as any, orderBy: { updatedAt: 'desc' } });
    const q = tasks.filter(t => t.status === 'assigned').length;
    const p = tasks.filter(t => t.status === 'processing').length;
    const c = tasks.filter(t => t.status === 'completed').length;
    res.json({ tasks: s(tasks), queuedCount: q, inProgressCount: p, completedCount: c });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/wigmaker/tasks/:taskCode
router.get('/tasks/:taskCode', ...wmOnly, async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string },
      include: { donations: { include: { user: true } }, wigmaker: true } as any
    });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }
    const histories = await getStatusHistories(WIG_TYPE, task.id, true);
    res.json({ task: s(task), histories: s(histories) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/wigmaker/tasks/:taskCode
router.post('/tasks/:taskCode', ...wmOnly, upload.single('previewPhoto'), validate(taskUpdateSchema), async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({ where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id } });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }

    const { status, progressNotes, updatedAt, deliveryLink, wigLength, wigColor } = req.body;
    const updateData: any = { status };
    if (deliveryLink) updateData.deliveryLink = deliveryLink;
    // When the wigmaker marks production as completed, save the wig specifications
    if (status === 'completed') {
      if (wigLength) updateData.targetLength = wigLength;
      if (wigColor) updateData.targetColor = wigColor;
    }
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

    // Sync linked donations status
    const tasksWithDonations = await prisma.wigProduction.findUnique({ where: { id: task.id }, include: { donations: true } as any }) as any;
    if ((tasksWithDonations?.donations as any[])?.length) {
      const statusMap: Record<string, string> = { assigned: 'In Queue', processing: 'In Progress', completed: 'Completed' };
      const newDonStatus = statusMap[status];
      if (newDonStatus) {
        for (const don of (tasksWithDonations.donations as any[])) {
          if (don.status !== newDonStatus) {
            await prisma.donation.update({ where: { id: don.id }, data: { status: newDonStatus } });
            await createStatusHistory(DON_TYPE, don.id, newDonStatus, progressNotes);
            if (don.userId) await notifyDonationStatus(don.userId, newDonStatus, don.reference!);
          }
        }
      }
    }

    if (status === 'completed' && updateData.deliveryLink) {
      const wmUser = await prisma.user.findUnique({ where: { id: task.wigmakerId } });
      await notifyStaffWigmakerCompletedWig(task.taskCode, wmUser?.name || 'Wigmaker', updateData.deliveryLink);
    }

    res.json({ message: 'Task updated successfully and synced with tracking.', success: true, delivery_link: updateData.deliveryLink || task.deliveryLink });
  } catch (err) {
    console.error('[Wigmaker] Task update error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /internal-api/wigmaker/tasks/:taskCode/confirm-material
router.post('/tasks/:taskCode/confirm-material', ...wmOnly, validate(materialConfirmationSchema), async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({ where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id } });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }
    if (task.isReceived) { res.status(400).json({ message: 'Material already confirmed.' }); return; }

    await prisma.wigProduction.update({ where: { id: task.id }, data: { isReceived: true } as any });
    
    const notes = req.body.notes || 'Wigmaker confirmed receipt of hair materials.';
    await createStatusHistory(WIG_TYPE, task.id, 'assigned', notes);

    // Sync donations status
    const taskWithDon = await prisma.wigProduction.findUnique({ where: { id: task.id }, include: { donations: true } as any }) as any;
    if ((taskWithDon?.donations as any[])?.length) {
      for (const don of (taskWithDon.donations as any[])) {
        await prisma.donation.update({ where: { id: don.id }, data: { status: 'In Progress' } });
        await createStatusHistory(DON_TYPE, don.id, 'In Progress', notes);
        if (don.userId) await notifyDonationStatus(don.userId, 'In Progress', don.reference!);
      }
    }

    const wmUser = await prisma.user.findUnique({ where: { id: task.wigmakerId } });
    await notifyStaffWigmakerReceivedMaterial(task.taskCode, wmUser?.name || 'Wigmaker');

    res.json({ message: 'Material receipt confirmed.', success: true });
  } catch (err) {
    console.error('[Wigmaker] Confirm material error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
