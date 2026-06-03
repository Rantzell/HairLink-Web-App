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
    const tasks = await prisma.wigProduction.findMany({
      where: {
        wigmakerId: req.user!.id,
        NOT: {
          taskCode: { contains: '-W' }
        }
      },
      include: { donations: true } as any
    });
    res.json(s(tasks));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/wigmaker/tasks
router.get('/tasks', ...wmOnly, async (req, res) => {
  try {
    const tasks = await prisma.wigProduction.findMany({
      where: {
        wigmakerId: req.user!.id,
        NOT: {
          taskCode: { contains: '-W' }
        }
      },
      include: { donations: true } as any,
      orderBy: { updatedAt: 'desc' }
    });
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
    
    // Fetch child wigs
    const childWigs = await prisma.wigProduction.findMany({
      where: {
        taskCode: {
          contains: `${req.params.taskCode}-W`
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ task: s(task), histories: s(histories), childWigs: s(childWigs) });
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
    console.log(`[Wigmaker API] Updating task ${task.taskCode}. req.file present: ${!!req.file}, body keys:`, Object.keys(req.body));
    if (req.file) {
      console.log(`[Wigmaker API] file upload details: name=${req.file.originalname}, size=${req.file.size}, type=${req.file.mimetype}`);
      const path = await uploadFile(req.file, 'hairlink', 'production/previews');
      metadata.preview_photo = path;
      console.log(`[Wigmaker API] saved photo path: ${path}`);
      
      // Update the main WigProduction record's preview_photo column
      await prisma.wigProduction.update({
        where: { id: task.id },
        data: { preview_photo: path }
      });
    } else {
      console.log(`[Wigmaker API] No req.file found for task update`);
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

// POST /internal-api/wigmaker/tasks/:taskCode/create-wig
router.post('/tasks/:taskCode/create-wig', ...wmOnly, upload.single('previewPhoto'), async (req, res) => {
  try {
    const parentTask = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id }
    });
    if (!parentTask) { res.status(404).json({ message: 'Parent task not found' }); return; }

    const { wigLength, wigColor, progressNotes, updatedAt } = req.body;
    if (!wigLength || !wigColor) {
      res.status(400).json({ message: 'Wig length and color are required.' });
      return;
    }

    // Naming convention: {parentWigCode}-W{index}  e.g. "WIG 2026-0001-W1"
    const childPattern = `${parentTask.taskCode}-W`;
    const count = await prisma.wigProduction.count({
      where: {
        taskCode: {
          startsWith: childPattern
        }
      }
    });

    const childWigCode = `${childPattern}${count + 1}`;

    let photoPath = null;
    if (req.file) {
      photoPath = await uploadFile(req.file, 'hairlink', 'production/previews');
    }

    // Create the finished child wig
    const childWig = await prisma.wigProduction.create({
      data: {
        taskCode: childWigCode,
        wigmakerId: parentTask.wigmakerId,
        targetLength: wigLength,
        targetColor: wigColor,
        preview_photo: photoPath,
        status: 'completed', // Production Finished
        isReceived: true,
        dueDate: parentTask.dueDate,
        materialDeliveryLink: parentTask.materialDeliveryLink,
      }
    });

    // Create status history for the child wig
    const historyMetadata = photoPath ? { preview_photo: photoPath } : null;
    await createStatusHistory(WIG_TYPE, childWig.id, 'completed', progressNotes || 'Wig production completed.', historyMetadata);

    // Also log progress update on the parent task
    const parentNotes = `Produced new wig: ${childWigCode} (${wigLength}, ${wigColor}). Note: ${progressNotes}`;
    const parentHistory = await createStatusHistory(WIG_TYPE, parentTask.id, parentTask.status, parentNotes, historyMetadata);
    
    if (updatedAt) {
      const uDate = new Date(updatedAt);
      await prisma.statusHistory.update({ where: { id: parentHistory.id }, data: { createdAt: uDate } });
    }

    res.json({ message: 'Wig created successfully and added to inventory.', success: true, taskCode: childWigCode });
  } catch (err) {
    console.error('[Wigmaker API] Create wig error:', err);
    res.status(500).json({ error: 'Failed to create wig' });
  }
});

// POST /internal-api/wigmaker/tasks/:taskCode/complete-task
router.post('/tasks/:taskCode/complete-task', ...wmOnly, upload.single('previewPhoto'), async (req, res) => {
  try {
    const parentTask = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id }
    });
    if (!parentTask) { res.status(404).json({ message: 'Parent task not found' }); return; }

    const { wigLength, wigColor, progressNotes, updatedAt } = req.body;
    if (!wigLength || !wigColor) {
      res.status(400).json({ message: 'Wig length and color are required.' });
      return;
    }

    // 1. Create the final child wig record — naming: {parentBatchCode}-W{index}
    const childPattern = `${parentTask.taskCode}-W`;
    const count = await prisma.wigProduction.count({
      where: {
        taskCode: {
          startsWith: childPattern
        }
      }
    });

    const childWigCode = `${childPattern}${count + 1}`;

    let photoPath = null;
    if (req.file) {
      photoPath = await uploadFile(req.file, 'hairlink', 'production/previews');
    }

    const childWig = await prisma.wigProduction.create({
      data: {
        taskCode: childWigCode,
        wigmakerId: parentTask.wigmakerId,
        targetLength: wigLength,
        targetColor: wigColor,
        preview_photo: photoPath,
        status: 'completed', // Production Finished
        isReceived: true,
        dueDate: parentTask.dueDate,
        materialDeliveryLink: parentTask.materialDeliveryLink,
      }
    });

    const historyMetadata = photoPath ? { preview_photo: photoPath } : null;
    await createStatusHistory(WIG_TYPE, childWig.id, 'completed', progressNotes || 'Wig production completed.', historyMetadata);

    // 2. Mark parent task as completed
    await prisma.wigProduction.update({
      where: { id: parentTask.id },
      data: { status: 'completed', preview_photo: photoPath }
    });

    const parentNotes = `Finalized production task and produced wig: ${childWigCode} (${wigLength}, ${wigColor}). Note: ${progressNotes}`;
    const parentHistory = await createStatusHistory(WIG_TYPE, parentTask.id, 'completed', parentNotes, historyMetadata);

    if (updatedAt) {
      const uDate = new Date(updatedAt);
      await prisma.statusHistory.update({ where: { id: parentHistory.id }, data: { createdAt: uDate } });
    }

    // 3. Sync parent task's donations status to Completed
    const taskWithDon = await prisma.wigProduction.findUnique({
      where: { id: parentTask.id },
      include: { donations: true } as any
    }) as any;

    if (taskWithDon?.donations?.length) {
      for (const don of taskWithDon.donations) {
        if (don.status !== 'Completed') {
          await prisma.donation.update({ where: { id: don.id }, data: { status: 'Completed' } });
          await createStatusHistory(DON_TYPE, don.id, 'Completed', 'Wigmaker finalized batch production.');
          if (don.userId) {
            await notifyDonationStatus(don.userId, 'Completed', don.reference!);
          }
        }
      }
    }

    res.json({ message: 'Task finalized successfully and last wig added to inventory.', success: true });
  } catch (err) {
    console.error('[Wigmaker API] Complete task error:', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// GET /internal-api/wigmaker/wigs
router.get('/wigs', ...wmOnly, async (req, res) => {
  try {
    const wigs = await prisma.wigProduction.findMany({
      where: {
        wigmakerId: req.user!.id,
        taskCode: {
          contains: '-W'
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(s(wigs));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wigs' });
  }
});

// POST /internal-api/wigmaker/wigs/ship
router.post('/wigs/ship', ...wmOnly, async (req, res) => {
  try {
    const { wigIds, deliveryLink, notes } = req.body;
    if (!wigIds || !Array.isArray(wigIds) || wigIds.length === 0) {
      res.status(400).json({ message: 'Please select at least 1 wig to ship.' });
      return;
    }
    if (!deliveryLink) {
      res.status(400).json({ message: 'Return tracking link is required.' });
      return;
    }

    // Find and verify these wigs belong to this wigmaker
    const wigs = await prisma.wigProduction.findMany({
      where: {
        id: { in: wigIds },
        wigmakerId: req.user!.id,
        taskCode: { contains: '-W' }
      }
    });

    if (wigs.length !== wigIds.length) {
      res.status(400).json({ message: 'Some selected wigs were not found or do not belong to you.' });
      return;
    }

    // Update statuses to shipped
    await prisma.wigProduction.updateMany({
      where: { id: { in: wigIds } },
      data: {
        status: 'shipped',
        deliveryLink: deliveryLink
      }
    });

    // Create status history for each wig and notify staff
    const shipNotes = notes || 'Wigs shipped back to staff.';
    const wmUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const { notifyStaffWigmakerCompletedWig } = await import('../services/notification.service');

    for (const w of wigs) {
      await createStatusHistory(WIG_TYPE, w.id, 'shipped', shipNotes);
      // Notify staff
      await notifyStaffWigmakerCompletedWig(w.taskCode, wmUser?.name || 'Wigmaker', deliveryLink);
    }

    res.json({ message: 'Wigs marked as shipped successfully.', success: true });
  } catch (err) {
    console.error('[Wigmaker API] Ship wigs error:', err);
    res.status(500).json({ error: 'Failed to ship wigs' });
  }
});

export default router;
