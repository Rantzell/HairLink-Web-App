import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { taskUpdateSchema, materialConfirmationSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile } from '../services/storage.service';
import { notifyDonationStatus, notifyStaffWigmakerCompletedWig, notifyStaffWigmakerReceivedMaterial, notifyStaffMissingHair, notifyStaffHairReceived } from '../services/notification.service';
import { generateSequentialReference } from '../services/reference.service';
import { logAudit } from '../services/audit.service';

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
        NOT: { taskCode: { contains: '-W' } }
      },
      include: { donations: { include: { user: true } } } as any,
      orderBy: { updatedAt: 'desc' }
    });

    const q = tasks.filter(t => t.status === 'assigned').length;
    const p = tasks.filter(t => t.status === 'processing').length;
    const c = tasks.filter(t => t.status === 'completed').length;

    // Build donationStateMap from status histories
    const allDonationIds: number[] = tasks.flatMap(t => ((t as any).donations || []).map((d: any) => d.id));
    const donationHistories = allDonationIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: {
            trackableType: DON_TYPE,
            trackableId: { in: allDonationIds },
            status: { in: ['wigmaker_received', 'missing'] }
          },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const donationStateMap: Record<number, { wigmakerReceived: boolean; isMissing: boolean }> = {};
    for (const h of donationHistories) {
      const id = h.trackableId as number;
      if (!donationStateMap[id]) donationStateMap[id] = { wigmakerReceived: false, isMissing: false };
      if (h.status === 'wigmaker_received') donationStateMap[id].wigmakerReceived = true;
      if (h.status === 'missing') donationStateMap[id].isMissing = true;
    }

    const taskIds = tasks.map(t => t.id);

    // Fetch the assignment status history (notes contain staff note)
    const assignmentHistories = taskIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: {
            trackableType: WIG_TYPE,
            trackableId: { in: taskIds },
            status: 'assigned'
          },
          orderBy: { createdAt: 'asc' }
        })
      : [];

    // Map: taskId -> first 'assigned' history notes (contains staff note)
    const staffNoteMap: Record<number, string | null> = {};
    for (const h of assignmentHistories) {
      const id = h.trackableId as number;
      if (!staffNoteMap[id]) staffNoteMap[id] = h.notes || null;
    }

    const tasksWithRef = tasks.map(t => ({
      ...t,
      batchHairReference: `B${t.id}-${String(new Date(t.createdAt!).getMonth() + 1).padStart(2, '0')}-${new Date(t.createdAt!).getFullYear()}`,
      staffNote: staffNoteMap[t.id] || null,
    }));

    res.json({ tasks: s(tasksWithRef), queuedCount: q, inProgressCount: p, completedCount: c, donationStateMap });
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

    const childWigs = await prisma.wigProduction.findMany({
      where: { taskCode: { contains: `${req.params.taskCode}-W` } },
      orderBy: { createdAt: 'desc' }
    });

    // Per-donation receive/missing state
    const donationIds: number[] = ((task as any).donations || []).map((d: any) => d.id);
    const donationHistories = donationIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: {
            trackableType: DON_TYPE,
            trackableId: { in: donationIds },
            status: { in: ['wigmaker_received', 'missing'] }
          },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const donationStateMap: Record<number, { wigmakerReceived: boolean; isMissing: boolean }> = {};
    for (const h of donationHistories) {
      const id = h.trackableId as number;
      if (!donationStateMap[id]) donationStateMap[id] = { wigmakerReceived: false, isMissing: false };
      if (h.status === 'wigmaker_received') donationStateMap[id].wigmakerReceived = true;
      if (h.status === 'missing') donationStateMap[id].isMissing = true;
    }

    res.json({ task: s(task), histories: s(histories), childWigs: s(childWigs), donationStateMap });
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

    await logAudit({
      req,
      action: 'wigmaker.task_updated',
      targetType: 'WigProduction',
      targetId: task.taskCode,
      description: `Wigmaker updated task ${task.taskCode} status to "${status}"`,
      metadata: { status, progressNotes: progressNotes ?? null },
    });

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

    // Child wig always uses WIG prefix: "WIG YYYY-XXXX-W1"
    const seqPart = parentTask.taskCode.replace(/^(WB|WIG)\s+/i, '');
    const childPrefix = `WIG ${seqPart}-W`;
    const count = await prisma.wigProduction.count({
      where: { taskCode: { startsWith: childPrefix } }
    });
    const childWigCode = `${childPrefix}${count + 1}`;

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

    // Child wig always uses WIG prefix: "WIG YYYY-XXXX-W1"
    const seqPart2 = parentTask.taskCode.replace(/^(WB|WIG)\s+/i, '');
    const childPrefix2 = `WIG ${seqPart2}-W`;
    const count = await prisma.wigProduction.count({
      where: { taskCode: { startsWith: childPrefix2 } }
    });
    const childWigCode = `${childPrefix2}${count + 1}`;

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

// POST /internal-api/wigmaker/wigs/create-free
router.post('/wigs/create-free', ...wmOnly, upload.single('previewPhoto'), async (req, res) => {
  try {
    const { wigLength, wigColor, progressNotes, updatedAt } = req.body;
    if (!wigLength || !wigColor) {
      res.status(400).json({ message: 'Wig length and color are required.' });
      return;
    }

    // A "standalone" parent is one whose taskCode matches /^WB \d{4}-\d{4}$/
    // (no -W suffix) and belongs to this wigmaker. We always append to the
    // most recent one so that multiple wigs end up as W1, W2, W3... under
    // the same batch instead of each getting their own batch.
    let parentTask: any = await prisma.wigProduction.findFirst({
      where: {
        wigmakerId: req.user!.id,
        taskCode: { startsWith: 'WB ' },
        NOT: { taskCode: { contains: '-W' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!parentTask) {
      // No existing standalone batch — create one
      let created = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const tc = await generateSequentialReference('WB');
        const seqPart = tc.replace(/^(WB|WIG)\s+/i, '');
        const parentWigCode = `WB ${seqPart}`;
        try {
          parentTask = await prisma.wigProduction.create({
            data: {
              taskCode: parentWigCode,
              wigmakerId: req.user!.id,
              status: 'completed',
              isReceived: true,
              targetLength: wigLength,
              targetColor: wigColor,
            }
          });
          created = true;
          break;
        } catch (createErr: any) {
          if (createErr?.code !== 'P2002' || !String(createErr?.meta?.target || '').includes('task_code')) {
            throw createErr;
          }
        }
      }
      if (!created) {
        res.status(409).json({ message: 'Unable to generate a unique wig task code. Please try again.' });
        return;
      }
    }

    // Count existing child wigs under this parent to determine the next W-number
    const seqPart = parentTask.taskCode.replace(/^(WB|WIG)\s+/i, '');
    const childPrefix = `WIG ${seqPart}-W`;
    const existingCount = await prisma.wigProduction.count({
      where: { taskCode: { startsWith: childPrefix } }
    });
    const childWigCode = `${childPrefix}${existingCount + 1}`;

    let photoPath = null;
    if (req.file) {
      photoPath = await uploadFile(req.file, 'hairlink', 'production/previews');
    }

    const newWig = await prisma.wigProduction.create({
      data: {
        taskCode: childWigCode,
        wigmakerId: req.user!.id,
        targetLength: wigLength,
        targetColor: wigColor,
        preview_photo: photoPath,
        status: 'completed',
        isReceived: true,
      }
    });

    const historyMetadata = photoPath ? { preview_photo: photoPath } : null;
    const parentHistory = await createStatusHistory(WIG_TYPE, parentTask.id, 'completed', 'Standalone production task updated by wigmaker.', historyMetadata);
    const childHistory = await createStatusHistory(WIG_TYPE, newWig.id, 'completed', progressNotes || 'Wig created freely by wigmaker.', historyMetadata);

    if (updatedAt) {
      const uDate = new Date(updatedAt);
      await prisma.statusHistory.update({ where: { id: parentHistory.id }, data: { createdAt: uDate } });
      await prisma.statusHistory.update({ where: { id: childHistory.id }, data: { createdAt: uDate } });
      await prisma.wigProduction.update({ where: { id: newWig.id }, data: { createdAt: uDate, updatedAt: uDate } });
    }

    res.json({ message: 'Wig created successfully and added to inventory.', success: true, taskCode: childWigCode });
  } catch (err) {
    console.error('[Wigmaker API] Create free wig error:', err);
    res.status(500).json({ error: 'Failed to create wig' });
  }
});

// GET /internal-api/wigmaker/wigs/next-code
router.get('/wigs/next-code', ...wmOnly, async (req, res) => {
  try {
    let parentTask: any = await prisma.wigProduction.findFirst({
      where: {
        wigmakerId: req.user!.id,
        taskCode: { startsWith: 'WB ' },
        NOT: { taskCode: { contains: '-W' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let childPrefix = '';
    
    if (!parentTask) {
      // If no parent exists, simulate generation
      const currentYear = new Date().getFullYear();
      const prefix = `WB ${currentYear}-`;
      const [wbRecs, wigRecs] = await Promise.all([
        prisma.wigProduction.findMany({
          where: { taskCode: { startsWith: `WB ${currentYear}-` }, NOT: { taskCode: { contains: '-W' } } },
          select: { taskCode: true },
        }),
        prisma.wigProduction.findMany({
          where: { taskCode: { startsWith: `WIG ${currentYear}-` }, NOT: { taskCode: { contains: '-W' } } },
          select: { taskCode: true },
        }),
      ]);
      const records = [...wbRecs, ...wigRecs];
      let maxSeq = 0;
      for (const record of records) {
        const refString = record.taskCode;
        if (!refString) continue;
        const lastHyphen = refString.lastIndexOf('-');
        if (lastHyphen === -1) continue;
        const seqText = refString.slice(lastHyphen + 1);
        if (/^\d+$/.test(seqText)) maxSeq = Math.max(maxSeq, parseInt(seqText, 10));
      }
      const nextParentCode = `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
      const seqPart = nextParentCode.replace(/^(WB|WIG)\s+/i, '');
      childPrefix = `WIG ${seqPart}-W`;
    } else {
      const seqPart = parentTask.taskCode.replace(/^(WB|WIG)\s+/i, '');
      childPrefix = `WIG ${seqPart}-W`;
    }

    const existingCount = await prisma.wigProduction.count({
      where: { taskCode: { startsWith: childPrefix } }
    });
    const childWigCode = `${childPrefix}${existingCount + 1}`;

    res.json({ nextCode: childWigCode });
  } catch (err) {
    console.error('[Wigmaker API] Next code error:', err);
    res.status(500).json({ error: 'Failed to generate next code' });
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

// DELETE /internal-api/wigmaker/wigs/bulk-delete
router.delete('/wigs/bulk-delete', ...wmOnly, async (req, res) => {
  try {
    const { wigIds } = req.body;
    if (!wigIds || !Array.isArray(wigIds) || wigIds.length === 0) {
      res.status(400).json({ message: 'No wigs selected for deletion.' });
      return;
    }

    // Ensure all wigs belong to this wigmaker and are child wigs
    const wigs = await prisma.wigProduction.findMany({
      where: {
        id: { in: wigIds },
        wigmakerId: req.user!.id,
        taskCode: { contains: '-W' }
      }
    });

    if (wigs.length === 0) {
      res.status(404).json({ message: 'No matching wigs found.' });
      return;
    }

    const foundIds = wigs.map(w => w.id);
    const SYSTEM_WIGMAKER_ID = '00000000-0000-0000-0000-000000000000';
    const wigsToKeep = wigs.filter(w => w.status === 'received' || w.status === 'matched');
    const wigsToDelete = wigs.filter(w => w.status !== 'received' && w.status !== 'matched');

    if (wigsToKeep.length > 0) {
      await prisma.user.upsert({
        where: { id: SYSTEM_WIGMAKER_ID },
        update: {},
        create: {
          id: SYSTEM_WIGMAKER_ID,
          name: 'System Pool',
          firstName: 'System',
          lastName: 'Pool',
          email: 'system-pool@hairlink.org',
          role: 'wigmaker',
          isActive: false,
        }
      });

      await prisma.wigProduction.updateMany({
        where: { id: { in: wigsToKeep.map(w => w.id) } },
        data: { wigmakerId: SYSTEM_WIGMAKER_ID }
      });
    }

    if (wigsToDelete.length > 0) {
      const deleteIds = wigsToDelete.map(w => w.id);
      await prisma.statusHistory.deleteMany({
        where: { trackableType: WIG_TYPE, trackableId: { in: deleteIds } }
      });
      await prisma.wigProduction.deleteMany({
        where: { id: { in: deleteIds } }
      });
    }

    res.json({ message: `${foundIds.length} wig(s) processed successfully.`, deletedIds: foundIds });
  } catch (err) {
    console.error('[Wigmaker API] Bulk delete wigs error:', err);
    res.status(500).json({ error: 'Failed to delete wigs' });
  }
});

// DELETE /internal-api/wigmaker/tasks/:taskCode
router.delete('/tasks/:taskCode', ...wmOnly, async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id },
      include: { donations: true } as any,
    });
    if (!task) { res.status(404).json({ message: 'Task not found or does not belong to you.' }); return; }

    // Unlink donations from this batch (set wigProductionId to null) and reset their status
    if ((task as any).donations?.length) {
      for (const don of (task as any).donations as any[]) {
        await prisma.donation.update({
          where: { id: don.id },
          data: { wigProductionId: null, status: 'Received Hair' } as any,
        });
        await createStatusHistory(DON_TYPE, don.id, 'Received Hair', `Batch ${task.taskCode} was deleted by wigmaker. Hair returned to unassigned pool.`);
      }
    }

    // Delete status histories for this task
    await prisma.statusHistory.deleteMany({
      where: { trackableType: WIG_TYPE, trackableId: task.id },
    });

    // Delete the task itself
    await prisma.wigProduction.delete({ where: { id: task.id } });

    res.json({ message: `Batch ${task.taskCode} deleted successfully.`, success: true });
  } catch (err) {
    console.error('[Wigmaker] Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete batch.' });
  }
});

// Helper to check if all hairs are accounted for and update batch status
async function checkAndUpdateBatchStatus(taskId: number) {
  const task = await prisma.wigProduction.findUnique({
    where: { id: taskId },
    include: { donations: true }
  });
  if (!task || !task.donations?.length) return;

  const donationIds = (task.donations as any[]).map(d => d.id);
  const histories = await prisma.statusHistory.findMany({
    where: {
      trackableType: DON_TYPE,
      trackableId: { in: donationIds },
      status: { in: ['wigmaker_received', 'missing'] }
    }
  });

  const processedDonationIds = new Set(histories.map(h => h.trackableId));

  if (processedDonationIds.size === donationIds.length && task.status !== 'received') {
    await prisma.wigProduction.update({
      where: { id: task.id },
      data: { status: 'received', isReceived: true } as any
    });
    await createStatusHistory(WIG_TYPE, task.id, 'received', `Wigmaker received all materials for batch ${task.taskCode}.`);
  }
}

// POST /internal-api/wigmaker/tasks/:taskCode/receive-hair/:donationId
router.post('/tasks/:taskCode/receive-hair/:donationId', ...wmOnly, async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id },
      include: { donations: true } as any,
    });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }

    const donationId = parseInt(req.params.donationId as string);
    const donation = (task as any).donations?.find((d: any) => d.id === donationId);
    if (!donation) { res.status(404).json({ message: 'Donation not found in this batch' }); return; }

    await createStatusHistory(DON_TYPE, donationId, 'wigmaker_received', `Wigmaker confirmed receipt of hair ${donation.reference} for batch ${task.taskCode}.`);

    const batchRef = `B${task.id}-${String(new Date(task.createdAt!).getMonth() + 1).padStart(2, '0')}-${new Date(task.createdAt!).getFullYear()}`;
    const wmUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    await notifyStaffHairReceived(task.taskCode, batchRef, donation.reference, wmUser?.name || 'Wigmaker');

    await checkAndUpdateBatchStatus(task.id);

    res.json({ message: `Hair ${donation.reference} marked as received.`, success: true });
  } catch (err) {
    console.error('[Wigmaker] Receive hair error:', err);
    res.status(500).json({ error: 'Failed to mark hair as received' });
  }
});

// POST /internal-api/wigmaker/tasks/:taskCode/report-missing/:donationId
router.post('/tasks/:taskCode/report-missing/:donationId', ...wmOnly, async (req, res) => {
  try {
    const task = await prisma.wigProduction.findFirst({
      where: { taskCode: req.params.taskCode as string, wigmakerId: req.user!.id },
      include: { donations: true } as any,
    });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }

    const donationId = parseInt(req.params.donationId as string);
    const donation = (task as any).donations?.find((d: any) => d.id === donationId);
    if (!donation) { res.status(404).json({ message: 'Donation not found in this batch' }); return; }

    const batchRef = `B${task.id}-${String(new Date(task.createdAt!).getMonth() + 1).padStart(2, '0')}-${new Date(task.createdAt!).getFullYear()}`;
    await createStatusHistory(DON_TYPE, donationId, 'missing', `Wigmaker reported hair ${donation.reference} as MISSING from batch ${task.taskCode}.`);

    const wmUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    await notifyStaffMissingHair(task.taskCode, batchRef, donation.reference, wmUser?.name || 'Wigmaker');

    await checkAndUpdateBatchStatus(task.id);

    res.json({ message: `Hair ${donation.reference} reported as missing. Staff has been notified.`, success: true });
  } catch (err) {
    console.error('[Wigmaker] Report missing error:', err);
    res.status(500).json({ error: 'Failed to report missing hair' });
  }
});

export default router;
