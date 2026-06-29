import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { verificationStatusSchema, assignWigmakerSchema, trackingStatusSchema, matchWigSchema, provideMaterialDeliveryLinkSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { calculateCompatibility } from '../services/matching.service';
import { generateSequentialReference } from '../services/reference.service';
import { notifyDonationStatus, notifyRequestStatus, createNotification, notifyPickupReady } from '../services/notification.service';
import crypto from 'crypto';

const router = Router();
const staffOnly = [authenticate, requireRole('staff', 'admin')];
const DONATION_TYPE = 'App\\Models\\Donation' as const;
const REQUEST_TYPE = 'App\\Models\\HairRequest' as const;
const WIG_TYPE = 'App\\Models\\WigProduction' as const;

function formatBatchHairReference(task: { id: number; createdAt?: Date | null }): string {
  const createdAt = task.createdAt ? new Date(task.createdAt) : new Date();
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const year = createdAt.getFullYear();
  return `B${task.id}-${month}-${year}`;
}

// BigInt serializer
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

// GET /internal-api/staff/dashboard
router.get('/dashboard', ...staffOnly, async (_req, res) => {
  try {
    const [pd, pr, ts, pc, ws, md] = await Promise.all([
      prisma.donation.count({ where: { status: 'Submitted' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.wigProduction.count({ where: { status: { in: ['assigned', 'processing', 'shipped'] }, taskCode: { contains: '-W' } } }),
      prisma.wigProduction.count({ where: { status: { in: ['completed', 'received'] }, taskCode: { contains: '-W' } } }),
      prisma.monetaryDonation.count({ where: { status: 'Submitted' } }),
    ]);
    res.json({ pendingDonations: pd, pendingRequests: pr, totalStock: ts, productionCount: pc, wigStockCount: ws, monetaryDonations: md });
  } catch (err: any) {
    console.error('Operations Error:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// GET /internal-api/staff/donor-verification
router.get('/donor-verification', ...staffOnly, async (_req, res) => {
  try {
    const d = await prisma.donation.findMany({ where: { status: 'Submitted' }, include: { user: true } });
    res.json(s(d));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/recipient-verification
router.get('/recipient-verification', ...staffOnly, async (_req, res) => {
  try {
    const r = await prisma.hairRequest.findMany({ where: { status: 'Submitted' }, include: { user: true } });
    res.json(s(r));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/monetary-verification
router.get('/monetary-verification', ...staffOnly, async (_req, res) => {
  try {
    const m = await prisma.monetaryDonation.findMany({ where: { status: 'Submitted' }, include: { user: true } });
    res.json(s(m));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/monetary-donations
// Read-only: full list of all monetary donations for staff record-keeping
router.get('/monetary-donations', ...staffOnly, async (_req, res) => {
  try {
    const donations = await prisma.monetaryDonation.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(s(donations));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /internal-api/staff/monetary-donations
// Bulk delete monetary donation records by array of IDs
router.delete('/monetary-donations', ...staffOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided.' });
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    await prisma.monetaryDonation.deleteMany({
      where: { id: { in: numericIds } },
    });
    res.json({ deleted: numericIds.length });
  } catch (err) { res.status(500).json({ error: 'Failed to delete.' }); }
});

// GET /internal-api/staff/verification/:type/:reference
router.get('/verification/:type/:reference', ...staffOnly, async (req, res) => {
  try {
    const { type, reference } = req.params;
    let record: any = null;
    if (type === 'donor') {
      record = await prisma.donation.findFirst({ where: { reference: reference as string }, include: { user: true } });
    } else if (type === 'recipient') {
      record = await prisma.hairRequest.findFirst({ where: { reference: reference as string }, include: { user: true } });
    } else if (type === 'monetary') {
      record = await prisma.monetaryDonation.findFirst({ where: { referenceNumber: reference as string }, include: { user: true } });
    }
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(s(record));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/verification/:type/:reference
router.post('/verification/:type/:reference', ...staffOnly, validate(verificationStatusSchema), async (req, res) => {
  try {
    const { type, reference } = req.params;
    const { status, remarks } = req.body;
    let record: any = null;
    if (type === 'donor') {
      record = await prisma.donation.findFirst({ where: { reference: reference as string } });
    } else if (type === 'recipient') {
      record = await prisma.hairRequest.findFirst({ where: { reference: reference as string } });
    } else if (type === 'monetary') {
      record = await prisma.monetaryDonation.findFirst({ where: { referenceNumber: reference as string } });
    }
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }

    if (type === 'donor') {
      await prisma.donation.update({ where: { id: record.id }, data: { status } });
      await createStatusHistory(DONATION_TYPE, record.id, status, remarks);
      if (record.userId) {
        await notifyDonationStatus(record.userId, status, reference as string);
      }
    } else if (type === 'recipient') {
      await prisma.hairRequest.update({ where: { id: record.id }, data: { status } });
      await createStatusHistory(REQUEST_TYPE, record.id, status, remarks);
      if (record.userId) {
        await notifyRequestStatus(record.userId, status, reference as string);
      }
    }
    res.json({ message: 'Status updated successfully', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/realtime-tracking
router.get('/realtime-tracking', ...staffOnly, async (_req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { status: { in: ['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'] } },
      include: { user: true }, orderBy: { updatedAt: 'desc' },
    });
    const wigmakers = await prisma.user.findMany({ where: { role: 'wigmaker', isActive: true } });
    
    // Fetch all parent tasks (where taskCode does not contain '-W')
    const wps = await prisma.wigProduction.findMany({
      where: {
        NOT: {
          taskCode: { contains: '-W' }
        }
      },
      include: {
        wigmaker: true,
        donations: {
          include: { user: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Fetch all child wigs associated with these parent tasks.
    // Parent may be "WB YYYY-XXXX" but children are "WIG YYYY-XXXX-W{n}",
    // so match on the shared sequence part (e.g. "2026-0001").
    const activeTaskCodes = wps.map(w => w.taskCode);
    const activeSeqs = activeTaskCodes.map(c => c.replace(/^(WB|WIG)\s+/i, '')); // ["2026-0001", ...]
    const childWigs = activeSeqs.length > 0
      ? await prisma.wigProduction.findMany({
          where: {
            OR: activeSeqs.map(seq => ({
              taskCode: { contains: `WIG ${seq}-W` }
            })),
          },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    const childWigsMap: Record<string, any[]> = {};
    for (const cw of childWigs) {
      const cwSeq = cw.taskCode.replace(/^(WB|WIG)\s+/i, '').replace(/-W\d+$/, '');
      // Among parents with the same sequence, pick the one created just before this child
      // (highest parent id that is still <= child id). This correctly assigns wigs created
      // under a WB parent even if an older WIG parent shares the same sequence number.
      const candidateParents = wps
        .filter(wp => wp.taskCode.replace(/^(WB|WIG)\s+/i, '') === cwSeq && wp.id <= cw.id)
        .sort((a, b) => b.id - a.id);
      const matchedWp = candidateParents[0];
      if (matchedWp) {
        const parentCode = matchedWp.taskCode;
        if (!childWigsMap[parentCode]) childWigsMap[parentCode] = [];
        childWigsMap[parentCode].push(cw);
      }
    }

    // Batch-fetch status histories for all wig productions (carries preview photos)
    const allWpIds = wps.map(w => w.id);
    const wpHistories = allWpIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: { trackableType: WIG_TYPE, trackableId: { in: allWpIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Group histories by wigProduction id
    const wpHistoriesMap: Record<number, any[]> = {};
    for (const h of wpHistories) {
      const id = h.trackableId as number;
      if (!wpHistoriesMap[id]) wpHistoriesMap[id] = [];
      wpHistoriesMap[id].push(h);
    }

    const wpMap: Record<string, any> = {};
    for (const d of donations) {
      if ((d as any).wigProductionId) {
        const wp = wps.find(w => w.id === (d as any).wigProductionId);
        if (wp) {
          wpMap[d.id] = s({
            ...wp,
            batchHairReference: formatBatchHairReference(wp),
            statusHistories: wpHistoriesMap[wp.id] || [],
            childWigs: childWigsMap[wp.taskCode] || [],
          });
        }
      }
    }

    const batches = wps.map(wp => s({
      ...wp,
      batchHairReference: formatBatchHairReference(wp),
      statusHistories: wpHistoriesMap[wp.id] || [],
      childWigs: childWigsMap[wp.taskCode] || [],
    }));

    // Fetch per-donation wigmaker receive/missing states from status history
    const donationIds = donations.map(d => d.id);
    const donationHistories = donationIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: {
            trackableType: DONATION_TYPE,
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

    const requests = await prisma.hairRequest.findMany({
      where: { status: { in: ['Validated', 'In Production', 'Matched', 'In Transit', 'Arrived', 'Ready for Pickup', 'Pickup Confirmed'] } },
      include: { user: true }, orderBy: { updatedAt: 'desc' },
    });
    res.json({ donations: s(donations), requests: s(requests), wigmakers: s(wigmakers), wigProductions: wpMap, batches, donationStateMap });
  } catch (err: any) { res.status(500).json({ error: 'Failed', message: err.message }); }
});

// POST /internal-api/staff/assign-batch
router.post('/assign-batch', ...staffOnly, validate(assignWigmakerSchema), async (req, res) => {
  try {
    const { wigmaker_id, donation_references, material_delivery_link, staff_note } = req.body;

    const donations = await prisma.donation.findMany({
      where: { reference: { in: donation_references } }
    });

    if (donations.length === 0) {
      res.status(400).json({ message: 'At least 1 valid donation is required.' });
      return;
    }

    const wm = await prisma.user.findUnique({ where: { id: wigmaker_id } });
    if (!wm) { res.status(404).json({ message: 'Wigmaker not found' }); return; }

    const due = new Date();
    due.setDate(due.getDate() + 30); // 30 days default

    const firstDonation = donations[0];
    const targetLength = firstDonation?.hairLength || 'Medium';
    const targetColor = firstDonation?.hairColor || 'Black';

    let task: any = null;
    let tc = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      tc = await generateSequentialReference('WB');
      try {
        task = await prisma.wigProduction.create({
          data: {
            taskCode: tc,
            wigmakerId: wm.id,
            status: 'assigned',
            dueDate: due,
            materialDeliveryLink: material_delivery_link || null,
            targetLength,
            targetColor
          }
        });
        break;
      } catch (createErr: any) {
        if (createErr?.code !== 'P2002' || !String(createErr?.meta?.target || '').includes('task_code')) {
          throw createErr;
        }
      }
    }
    if (!task) {
      res.status(409).json({ message: 'Unable to generate a unique batch task code. Please try again.' });
      return;
    }
    const batchHairReference = formatBatchHairReference(task);

    const { notifyDonationStatus, notifyWigmakerAssignment, notifyWigmakerMaterialDelivery } = await import('../services/notification.service');

    for (const don of donations) {
      await prisma.donation.update({
        where: { id: don.id },
        data: { 
          status: 'In Queue',
          wigProductionId: task.id
        } as any
      });
      await createStatusHistory(DONATION_TYPE, don.id, 'In Queue', `Batched for production (${batchHairReference}). Wigmaker: ${wm.firstName || 'Staff'} ${wm.lastName || ''}${staff_note ? ` — Note: ${staff_note}` : ''}`);
      
      if (don.userId) {
        await notifyDonationStatus(don.userId, 'In Queue', don.reference!);
      }
    }

    // Log staff note on the task itself
    const assignmentNote = `Batch ${batchHairReference} assigned by staff.${staff_note ? ` Staff note: ${staff_note}` : ''}`;
    await createStatusHistory(WIG_TYPE, task.id, 'assigned', assignmentNote);

    // Notify wigmaker
    await notifyWigmakerAssignment(wm.id, tc, staff_note || undefined);
    if (material_delivery_link) {
      await notifyWigmakerMaterialDelivery(wm.id, tc, material_delivery_link);
    }

    res.json({ message: `Batch ${batchHairReference} assigned to ${wm.firstName || 'Wigmaker'}.`, success: true, task_code: tc, batch_hair_reference: batchHairReference });
  } catch (err: any) { 
    res.status(500).json({ error: 'Failed', message: err.message }); 
  }
});

// POST /internal-api/staff/batches/:taskCode/delivery-link
router.post('/batches/:taskCode/delivery-link', ...staffOnly, validate(provideMaterialDeliveryLinkSchema), async (req, res) => {
  try {
    const { taskCode } = req.params;
    const { material_delivery_link } = req.body;

    const task = await prisma.wigProduction.findFirst({
      where: { taskCode: taskCode as string },
      include: { wigmaker: true }
    });

    if (!task) {
      res.status(404).json({ message: 'Batch task not found' });
      return;
    }

    const updatedTask = await prisma.wigProduction.update({
      where: { id: task.id },
      data: { materialDeliveryLink: material_delivery_link }
    });

    // Create status history for the wig task
    await createStatusHistory(
      WIG_TYPE,
      task.id,
      task.status,
      `Material delivery link provided by staff: ${material_delivery_link}`
    );

    // Notify the wigmaker
    const { notifyWigmakerMaterialDelivery } = await import('../services/notification.service');
    await notifyWigmakerMaterialDelivery(task.wigmakerId, task.taskCode, material_delivery_link);

    res.json({ message: 'Material delivery link updated successfully', success: true, task: s(updatedTask) });
  } catch (err: any) {
    console.error('[Staff] Provide delivery link error:', err);
    res.status(500).json({ error: 'Failed to update material delivery link', message: err.message });
  }
});


// POST /internal-api/staff/tracking/:reference/status
router.post('/tracking/:reference/status', ...staffOnly, validate(trackingStatusSchema), async (req, res) => {
  try {
    const { reference } = req.params;
    const { status: ns, notes, delivery_tracking_link } = req.body;
    let record: any = await prisma.donation.findFirst({ where: { reference: reference as string } });
    let isDon = !!record;
    if (!record) record = await prisma.hairRequest.findFirst({ where: { reference: reference as string } });
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    const tt = isDon ? DONATION_TYPE : REQUEST_TYPE;
    const ud: any = { status: ns };
    if (ns === 'Wig Received') {
      if (isDon) ud.receivedWigAt = new Date();
      else ud.receivedAt = new Date();
    }
    if (ns === 'In Transit' && delivery_tracking_link) {
      if (isDon) ud.donorDeliveryLink = delivery_tracking_link;
      else ud.deliveryLink = delivery_tracking_link;
    }
    if (ns === 'Received Hair' && isDon && record.reference && !record.certificateNo) ud.certificateNo = `CERT-${new Date().getFullYear()}-${(record.reference as string).slice(-6)}`;
    if (isDon) {
      const wasReceived = record.status === 'Received Hair';
      await prisma.donation.update({ where: { id: record.id }, data: ud });
      await createStatusHistory(tt, record.id, ns, notes);

      const { notifyDonationStatus } = await import('../services/notification.service');
      if (record.userId) await notifyDonationStatus(record.userId, ns, reference as string);

      // Milestone: only award on a genuine transition INTO "Received Hair".
      // `wasReceived` short-circuits if staff edits other fields on an already-
      // received donation, preventing double credit.
      if (ns === 'Received Hair' && !wasReceived && record.userId) {
        const { addMilestonePoints, POINTS } = await import('../services/milestone.service');
        await addMilestonePoints(record.userId, POINTS.HAIR_RECEIVED);
      }

      if (ns === 'Wig Received') {
        const completedWigs = await prisma.wigProduction.findMany({
          where: { donations: { some: { id: record.id } }, status: { in: ['completed', 'shipped'] } } as any,
        });

        await prisma.wigProduction.updateMany({
          where: { donations: { some: { id: record.id } }, status: { in: ['completed', 'shipped'] } } as any,
          data: { status: 'received' }
        });

        const { notifyWigmakerStaffReceivedWig } = await import('../services/notification.service');
        for (const cw of completedWigs) {
          await notifyWigmakerStaffReceivedWig(cw.wigmakerId, cw.taskCode);
        }
      }
    } else {
      await prisma.hairRequest.update({ where: { id: record.id }, data: ud });
      await createStatusHistory(tt, record.id, ns, notes);

      const { notifyRequestStatus } = await import('../services/notification.service');
      if (record.userId) await notifyRequestStatus(record.userId, ns, reference as string);
    }
    await createStatusHistory(tt, record.id, ns, notes || `Status updated to ${ns} by staff`);
    res.json({ message: `Status updated to ${ns}.`, success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/match-wig
router.post('/match-wig', ...staffOnly, validate(matchWigSchema), async (req, res) => {
  try {
    const hr = await prisma.hairRequest.findFirst({ where: { reference: req.body.request_reference } });
    if (!hr) { res.status(404).json({ message: 'Not found' }); return; }
    const wig = await prisma.wigProduction.findUnique({ where: { id: req.body.wig_id } });
    if (!wig) { res.status(404).json({ message: 'Wig not found' }); return; }
    await prisma.hairRequest.update({ where: { id: hr.id }, data: { status: 'Matched' } });
    await createStatusHistory(REQUEST_TYPE, hr.id, 'Matched', `Matched with Wig #${wig.taskCode}`);
    await prisma.wigProduction.update({ where: { id: wig.id }, data: { hairRequestId: hr.id, status: 'matched' } });
    // Notify the recipient that their wig has been matched
    const { notifyRequestStatus } = await import('../services/notification.service');
    if (hr.userId) await notifyRequestStatus(hr.userId, 'Matched', hr.reference as string);
    res.json({ message: `Matched with Wig #${wig.taskCode}.`, success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/hair-stock
router.get('/hair-stock', ...staffOnly, async (_req, res) => {
  try {
    const dons = await prisma.donation.findMany({ where: { status: 'Received Hair' } });
    const stock: Record<string, Record<string, number>> = { Short: { Black: 0, Brown: 0, Light: 0 }, Long: { Black: 0, Brown: 0, Light: 0 } };

    // Normalize any length string (e.g. "12 inches", "short", "14 inches") to Short/Long only
    const normalizeLength = (raw: string): string => {
      const lower = raw.toLowerCase().trim();
      // Already a plain category
      if (lower === 'short') return 'Short';
      if (lower === 'long') return 'Long';
      // Extract numeric inch value (e.g. "12 inches", "12\"", "12in")
      const inchMatch = lower.match(/^(\d+(\.\d+)?)\s*(inches?|in|")?$/);
      if (inchMatch) {
        const inches = parseFloat(inchMatch[1]);
        return inches < 12 ? 'Short' : 'Long';
      }
      // Fallback: check if any keyword is present
      if (lower.includes('short')) return 'Short';
      if (lower.includes('long')) return 'Long';
      // Default to Long for unrecognized values
      return 'Long';
    };

    const normalizeColor = (raw: string): string => {
      const lower = raw.toLowerCase();
      if (lower.includes('black')) return 'Black';
      if (lower.includes('brown')) return 'Brown';
      if (lower.includes('light') || lower.includes('blonde')) return 'Light';
      return 'Other';
    };

    let uncategorized = 0;
    for (const d of dons) {
      if (!d.hairLength || !d.hairColor) { uncategorized++; continue; }
      const l = normalizeLength(d.hairLength);
      const c = normalizeColor(d.hairColor);
      if (!stock[l]) stock[l] = {};
      if (stock[l][c] === undefined) stock[l][c] = 0;
      stock[l][c]++;
    }

    res.json({ stock, uncategorized });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/wig-stock
router.get('/wig-stock', ...staffOnly, async (_req, res) => {
  try {
    const wigs = await prisma.wigProduction.findMany({
      where: { status: 'received' },
      include: { donations: true } as any,
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    const allWpIds = wigs.map(w => w.id);
    const wpHistories = allWpIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: { trackableType: WIG_TYPE, trackableId: { in: allWpIds } },
          orderBy: { id: 'desc' },
        })
      : [];

    const wpHistoriesMap: Record<number, any[]> = {};
    for (const h of wpHistories) {
      const id = h.trackableId as number;
      if (!wpHistoriesMap[id]) wpHistoriesMap[id] = [];
      wpHistoriesMap[id].push(h);
    }

    const { getPublicUrl } = await import('../services/storage.service');

    // Returns both possible parent codes: "WB YYYY-XXXX" and "WIG YYYY-XXXX"
    const getParentTaskCodes = (childWigCode: string): string[] => {
      const wIdx = childWigCode.lastIndexOf('-W');
      if (wIdx === -1) return [];
      const seq = childWigCode.substring(0, wIdx).replace(/^(WB|WIG)\s+/i, '');
      return [`WB ${seq}`, `WIG ${seq}`];
    };

    const childWigs = wigs.filter(w => w.taskCode.includes('-W'));
    const allParentCodes = [...new Set(childWigs.flatMap(w => getParentTaskCodes(w.taskCode)))];

    const parentTasks = allParentCodes.length > 0
      ? await prisma.wigProduction.findMany({
          where: { taskCode: { in: allParentCodes } },
          include: { donations: true }
        })
      : [];

    const mappedWigs = wigs.map(w => {
      let photoPath = w.preview_photo;
      if (!photoPath) {
        const histories = wpHistoriesMap[w.id] || [];
        const historyWithPhoto = histories.find(h => h.metadata && (h.metadata as any).preview_photo);
        if (historyWithPhoto) {
          photoPath = (historyWithPhoto.metadata as any).preview_photo;
        }
      }

      let donations = w.donations || [];
      if (w.taskCode.includes('-W')) {
        const possibleParents = getParentTaskCodes(w.taskCode);
        const parentTask = parentTasks.find(pt => possibleParents.includes(pt.taskCode));
        if (parentTask) {
          donations = parentTask.donations;
        }
      }

      let mockDonation = null;
      if (donations && donations.length > 0) {
        mockDonation = {
          reference: donations.map((d: any) => d.reference).join(', ')
        };
      }

      return {
        ...w,
        photo_url: photoPath ? getPublicUrl('hairlink', photoPath) : null,
        donations,
        donation: mockDonation
      };
    });

    res.json(s(mappedWigs));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/matching-list
router.get('/matching-list', ...staffOnly, async (_req, res) => {
  try {
    const reqs = await prisma.hairRequest.findMany({ where: { status: { in: ['Validated', 'Matched', 'In Transit', 'Arrived', 'Ready for Pickup'] } }, include: { user: true }, orderBy: { updatedAt: 'desc' } });
    const avail = await prisma.wigProduction.findMany({ 
      where: {
        status: { in: ['completed', 'received'] },
        hairRequestId: null,
        taskCode: { contains: '-W' }
      }
    });
    const result = reqs.map(r => {
      if (r.status !== 'Validated') return { ...s(r), best_match: null, match_score: 0 };
      let bw: any = null, ms = -1;
      for (const w of avail) { const sc = calculateCompatibility(r, w); if (sc > ms) { ms = sc; bw = w; } }
      return { ...s(r), best_match: ms > 0 ? s(bw) : null, match_score: ms };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});


// POST /internal-api/staff/requests/:reference/ready-for-pickup
router.post('/requests/:reference/ready-for-pickup', ...staffOnly, async (req, res) => {
  try {
    const { reference } = req.params;
    const hr = await prisma.hairRequest.findFirst({ where: { reference: reference as string } });
    if (!hr) { res.status(404).json({ message: 'Not found' }); return; }

    if ((hr as any).deliveryMethod !== 'pickup') {
      res.status(422).json({ message: 'This action is only available for pick-up requests.' });
      return;
    }
    if (hr.status !== 'Matched') {
      res.status(422).json({ message: 'Request must be in Matched status before marking as Ready for Pickup.' });
      return;
    }

    await prisma.hairRequest.update({ where: { id: hr.id }, data: { status: 'Ready for Pickup' } });
    await createStatusHistory(REQUEST_TYPE, hr.id, 'Ready for Pickup', 'Wig is ready for collection at our Binondo office.');
    if (hr.userId) await notifyPickupReady(hr.userId, hr.reference!);

    res.json({ message: 'Request marked as Ready for Pickup. Recipient has been notified.', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/rule-matching
router.get('/rule-matching', ...staffOnly, async (_req, res) => {
  try {
    const recipients = await prisma.hairRequest.findMany({ where: { status: { in: ['Validated', 'Submitted'] } }, include: { user: true } });
    const wigs = await prisma.wigProduction.findMany({
      where: {
        status: { in: ['completed', 'received'] },
        taskCode: { contains: '-W' }
      },
      include: { donations: true } as any
    });
    res.json({ recipients: s(recipients), wigs: s(wigs) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/wigs/:id/receive
router.post('/wigs/:id/receive', ...staffOnly, async (req, res) => {
  try {
    const wigId = parseInt(req.params.id as string);
    const wig = await prisma.wigProduction.findUnique({
      where: { id: wigId }
    });

    if (!wig || !wig.taskCode.includes('-W')) {
      res.status(404).json({ message: 'Wig not found' });
      return;
    }

    await prisma.wigProduction.update({
      where: { id: wigId },
      data: { status: 'received' }
    });

    await createStatusHistory('App\\Models\\WigProduction', wigId, 'received', 'Staff confirmed receipt of the finished wig.');

    // Check if all sibling wigs for the parent batch are now received
    // Returns both possible parent codes: "WB YYYY-XXXX" and "WIG YYYY-XXXX"
    const getParentTaskCodes = (childWigCode: string): string[] => {
      const wIdx = childWigCode.lastIndexOf('-W');
      if (wIdx === -1) return [];
      const seq = childWigCode.substring(0, wIdx).replace(/^(WB|WIG)\s+/i, '');
      return [`WB ${seq}`, `WIG ${seq}`];
    };

    const possibleParentCodes = getParentTaskCodes(wig.taskCode);
    const parentTask = possibleParentCodes.length > 0
      ? await prisma.wigProduction.findFirst({ where: { taskCode: { in: possibleParentCodes } } })
      : null;
    if (parentTask) {
      const seq = parentTask.taskCode.replace(/^(WB|WIG)\s+/i, '');
      const siblingWigs = await prisma.wigProduction.findMany({
        where: {
          taskCode: { contains: `-W`, startsWith: `WIG ${seq}` },
          id: { not: wigId }
        }
      });
      const allReceived = siblingWigs.every(s => s.status === 'received');
      if (allReceived) {
        await prisma.wigProduction.update({ where: { id: parentTask.id }, data: { status: 'received' } });
        await createStatusHistory('App\\Models\\WigProduction', parentTask.id, 'received', 'All finished wigs in this batch have been received.');
      }
    }

    // Notify the wigmaker
    const { notifyWigmakerStaffReceivedWig } = await import('../services/notification.service');
    await notifyWigmakerStaffReceivedWig(wig.wigmakerId, wig.taskCode);

    res.json({ message: 'Wig marked as received.', success: true });
  } catch (err) {
    console.error('[Staff API] Receive wig error:', err);
    res.status(500).json({ error: 'Failed to receive wig' });
  }
});

// POST /internal-api/staff/wigs/:id/missing
router.post('/wigs/:id/missing', ...staffOnly, async (req, res) => {
  try {
    const wigId = parseInt(req.params.id as string);
    const wig = await prisma.wigProduction.findUnique({ where: { id: wigId } });
    if (!wig || !wig.taskCode.includes('-W')) {
      res.status(404).json({ message: 'Wig not found' });
      return;
    }
    await prisma.wigProduction.update({ where: { id: wigId }, data: { status: 'missing' } });
    await createStatusHistory(WIG_TYPE, wigId, 'missing', 'Staff reported this wig as missing from the shipment.');

    // Notify the wigmaker
    const { notifyWigmakerStaffReportedMissingWig } = await import('../services/notification.service');
    await notifyWigmakerStaffReportedMissingWig(wig.wigmakerId, wig.taskCode);

    res.json({ message: 'Wig reported as missing.', success: true });
  } catch (err) {
    console.error('[Staff API] Missing wig error:', err);
    res.status(500).json({ error: 'Failed to report wig as missing' });
  }
});

// POST /internal-api/staff/batches/:id/receive-all
router.post('/batches/:id/receive-all', ...staffOnly, async (req, res) => {
  try {
    const batchId = parseInt(req.params.id as string);
    const { delivery_tracking_link } = req.body;

    const batch = await prisma.wigProduction.findUnique({
      where: { id: batchId },
      include: { donations: true }
    });

    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const seq = batch.taskCode.replace(/^(WB|WIG)\s+/i, '');
    const childWigs = await prisma.wigProduction.findMany({
      where: { taskCode: { startsWith: `WIG ${seq}-W` }, status: { in: ['completed', 'shipped'] } }
    });

    const wigsToUpdate = [batch, ...childWigs].filter(w => ['assigned', 'processing', 'completed', 'shipped'].includes(w.status));

    if (wigsToUpdate.length > 0) {
      await prisma.wigProduction.updateMany({
        where: { id: { in: wigsToUpdate.map(w => w.id) } },
        data: { status: 'received' }
      });

      for (const w of wigsToUpdate) {
        await createStatusHistory(WIG_TYPE, w.id, 'received', 'Staff confirmed receipt of all wigs in this batch.');
      }
    }

    // Also update the donations' status to 'Wig Received'
    if (batch.donations && batch.donations.length > 0) {
      const donIds = batch.donations.map((d: any) => d.id);
      await prisma.donation.updateMany({
        where: { id: { in: donIds } },
        data: { status: 'Wig Received', receivedWigAt: new Date() }
      });

      const { notifyDonationStatus } = await import('../services/notification.service');
      for (const don of batch.donations) {
        await createStatusHistory(DONATION_TYPE, don.id, 'Wig Received', 'All produced wigs have been received by staff.');
        if (don.userId) {
          await notifyDonationStatus(don.userId, 'Wig Received', don.reference!);
        }
      }
    }

    // Notify wigmaker for child wigs
    const { notifyWigmakerStaffReceivedWig } = await import('../services/notification.service');
    for (const cw of childWigs) {
      await notifyWigmakerStaffReceivedWig(cw.wigmakerId, cw.taskCode);
    }

    res.json({ success: true, message: 'All wigs received successfully.' });
  } catch (err) {
    console.error('[Staff API] Receive all error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// DELETE /internal-api/staff/batches/:id
router.delete('/batches/:id', ...staffOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const batch = await prisma.wigProduction.findUnique({
      where: { id },
      include: { donations: true }
    });

    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    // Find child wigs by taskCode pattern
    const seq = batch.taskCode.replace(/^(WB|WIG)\s+/i, '');
    const childWigs = await prisma.wigProduction.findMany({
      where: { taskCode: { startsWith: `WIG ${seq}-W` } },
      select: { id: true }
    });
    const childIds = childWigs.map(w => w.id);

    // Unlink donations from this batch (keeps donation records intact, just removes the batch reference)
    if (batch.donations && batch.donations.length > 0) {
      const donIds = batch.donations.map((d: any) => d.id);
      await prisma.donation.updateMany({
        where: { id: { in: donIds } },
        data: { wigProductionId: null } as any
      });
    }

    // Delete status history for the batch and its child wigs
    await prisma.statusHistory.deleteMany({
      where: { 
        trackableType: WIG_TYPE, 
        trackableId: { in: [id, ...childIds] } 
      }
    });

    // Delete the child wigs
    if (childIds.length > 0) {
      await prisma.wigProduction.deleteMany({
        where: { id: { in: childIds } }
      });
    }

    // Delete the batch record itself
    await prisma.wigProduction.delete({ where: { id } });

    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (err) {
    console.error('[Staff API] Delete batch error:', err);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

export default router;
