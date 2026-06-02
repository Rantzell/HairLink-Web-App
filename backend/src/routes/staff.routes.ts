import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { verificationStatusSchema, assignWigmakerSchema, trackingStatusSchema, matchWigSchema, provideMaterialDeliveryLinkSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { calculateCompatibility } from '../services/matching.service';
import { notifyDonationStatus, notifyRequestStatus, createNotification, notifyPickupReady } from '../services/notification.service';
import crypto from 'crypto';

const router = Router();
const staffOnly = [authenticate, requireRole('staff', 'admin')];
const DONATION_TYPE = 'App\\Models\\Donation' as const;
const REQUEST_TYPE = 'App\\Models\\HairRequest' as const;
const WIG_TYPE = 'App\\Models\\WigProduction' as const;

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
    const [pd, pr, ts, pc, ws] = await Promise.all([
      prisma.donation.count({ where: { status: 'Submitted' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.wigProduction.count({ where: { status: { in: ['assigned', 'processing'] } } }),
      prisma.wigProduction.count({ where: { status: 'completed' } }),
    ]);
    res.json({ pendingDonations: pd, pendingRequests: pr, totalStock: ts, productionCount: pc, wigStockCount: ws });
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
    const wpIds = donations
      .map(d => (d as any).wigProductionId)
      .filter((id: any) => id != null) as number[]; // filter out null/undefined

    let wps: any[] = [];
    if (wpIds.length > 0) {
      wps = await prisma.wigProduction.findMany({
        where: { id: { in: wpIds } },
        include: { wigmaker: true },
      });
    }
    const wpMap: Record<string, any> = {};
    for (const d of donations) {
      if ((d as any).wigProductionId) {
        const wp = wps.find(w => w.id === (d as any).wigProductionId);
        if (wp) wpMap[d.id] = s(wp);
      }
    }
    const requests = await prisma.hairRequest.findMany({
      where: { status: { in: ['Validated', 'In Production', 'Matched', 'In Transit', 'Arrived', 'Completed', 'Ready for Pickup', 'Pickup Confirmed'] } },
      include: { user: true }, orderBy: { updatedAt: 'desc' },
    });
    res.json({ donations: s(donations), requests: s(requests), wigmakers: s(wigmakers), wigProductions: wpMap });
  } catch (err: any) { res.status(500).json({ error: 'Failed', message: err.message }); }
});

// POST /internal-api/staff/assign-batch
router.post('/assign-batch', ...staffOnly, validate(assignWigmakerSchema), async (req, res) => {
  try {
    const { wigmaker_id, donation_references, material_delivery_link } = req.body;

    const donations = await prisma.donation.findMany({
      where: { reference: { in: donation_references } }
    });

    if (donations.length === 0) {
      res.status(400).json({ message: 'At least 1 valid donation is required.' });
      return;
    }

    const wm = await prisma.user.findUnique({ where: { id: wigmaker_id } });
    if (!wm) { res.status(404).json({ message: 'Wigmaker not found' }); return; }

    const tc = `WIG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const due = new Date();
    due.setDate(due.getDate() + 30); // 30 days default

    const firstDonation = donations[0];
    const targetLength = firstDonation?.hairLength || 'Medium';
    const targetColor = firstDonation?.hairColor || 'Black';

    const task = await prisma.wigProduction.create({
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

    const { notifyDonationStatus, notifyWigmakerAssignment, notifyWigmakerMaterialDelivery } = await import('../services/notification.service');

    for (const don of donations) {
      await prisma.donation.update({
        where: { id: don.id },
        data: { 
          status: 'In Queue',
          wigProductionId: task.id
        } as any
      });
      await createStatusHistory(DONATION_TYPE, don.id, 'In Queue', `Batched for production. Wigmaker: ${wm.firstName || 'Staff'} ${wm.lastName || ''}`);
      
      if (don.userId) {
        await notifyDonationStatus(don.userId, 'In Queue', don.reference!);
      }
    }

    // Notify wigmaker
    await notifyWigmakerAssignment(wm.id, tc);
    if (material_delivery_link) {
      await notifyWigmakerMaterialDelivery(wm.id, tc, material_delivery_link);
    }

    res.json({ message: `Batch assigned to ${wm.firstName || 'Wigmaker'}.`, success: true, task_code: tc });
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
      await prisma.donation.update({ where: { id: record.id }, data: ud });
      await createStatusHistory(tt, record.id, ns, notes);
      
      const { notifyDonationStatus } = await import('../services/notification.service');
      if (record.userId) await notifyDonationStatus(record.userId, ns, reference as string);

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
    const stock: Record<string, Record<string, number>> = { Short: { Black: 0, Brown: 0, Light: 0 }, Medium: { Black: 0, Brown: 0, Light: 0 }, Long: { Black: 0, Brown: 0, Light: 0 } };
    for (const d of dons) {
      if (!d.hairLength || !d.hairColor) continue;
      let l = d.hairLength.charAt(0).toUpperCase() + d.hairLength.slice(1).toLowerCase();
      let c = d.hairColor.charAt(0).toUpperCase() + d.hairColor.slice(1).toLowerCase();
      if (c.includes('Black')) c = 'Black'; if (c.includes('Brown')) c = 'Brown';
      if (c.includes('Light') || c.includes('Blonde')) c = 'Light';
      if (stock[l]?.[c] !== undefined) stock[l][c]++;
    }
    res.json({ stock });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/wig-stock
router.get('/wig-stock', ...staffOnly, async (_req, res) => {
  try {
    const wigs = await prisma.wigProduction.findMany({ 
      where: { status: { in: ['completed', 'received'] } }, 
      include: { donations: true } as any, 
      orderBy: { updatedAt: 'desc' }, 
      take: 50 
    });
    res.json(s(wigs));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/matching-list
router.get('/matching-list', ...staffOnly, async (_req, res) => {
  try {
    const reqs = await prisma.hairRequest.findMany({ where: { status: { in: ['Validated', 'Matched', 'In Transit', 'Arrived', 'Ready for Pickup', 'Pickup Confirmed'] } }, include: { user: true }, orderBy: { updatedAt: 'desc' } });
    const avail = await prisma.wigProduction.findMany({ 
      where: { status: { in: ['completed', 'received'] }, hairRequestId: null } 
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

// POST /internal-api/staff/requests/:reference/complete-pickup
router.post('/requests/:reference/complete-pickup', ...staffOnly, async (req, res) => {
  try {
    const { reference } = req.params;
    const hr = await prisma.hairRequest.findFirst({ where: { reference: reference as string } });
    if (!hr) { res.status(404).json({ message: 'Not found' }); return; }

    if ((hr as any).deliveryMethod !== 'pickup') {
      res.status(422).json({ message: 'This action is only available for pick-up requests.' });
      return;
    }
    if (hr.status !== 'Pickup Confirmed') {
      res.status(422).json({ message: 'Request must be in Pickup Confirmed status before marking as Completed.' });
      return;
    }

    await prisma.hairRequest.update({ where: { id: hr.id }, data: { status: 'Completed' } });
    await createStatusHistory(REQUEST_TYPE, hr.id, 'Completed', 'Hair request successfully fulfilled and closed by staff.');

    const { notifyRequestStatus } = await import('../services/notification.service');
    if (hr.userId) await notifyRequestStatus(hr.userId, 'Completed', hr.reference!);

    // Notify linked donors
    const wp = await prisma.wigProduction.findFirst({ where: { hairRequestId: hr.id }, include: { donations: true } });
    if (wp?.donations) {
      const { notifyDonationStatus } = await import('../services/notification.service');
      for (const don of wp.donations) {
        if (don.userId) await notifyDonationStatus(don.userId, 'Wig Received', don.reference!);
      }
    }

    res.json({ message: 'Transaction marked as Completed.', success: true });
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
      where: { status: { in: ['completed', 'received'] } }, 
      include: { donations: true } as any 
    });
    res.json({ recipients: s(recipients), wigs: s(wigs) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
