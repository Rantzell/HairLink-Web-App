import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { verificationStatusSchema, assignWigmakerSchema, trackingStatusSchema, matchWigSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { calculateCompatibility } from '../services/matching.service';
import crypto from 'crypto';

const router = Router();
const staffOnly = [authenticate, requireRole('staff', 'admin')];
const DONATION_TYPE = 'App\\Models\\Donation' as const;
const REQUEST_TYPE = 'App\\Models\\HairRequest' as const;
const WIG_TYPE = 'App\\Models\\WigProduction' as const;

// BigInt serializer
function s(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(s);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = s(obj[k]);
    return out;
  }
  return obj;
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
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
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

// GET /internal-api/staff/verification/:type/:reference
router.get('/verification/:type/:reference', ...staffOnly, async (req, res) => {
  try {
    const { type, reference } = req.params;
    const record = type === 'donor'
      ? await prisma.donation.findFirst({ where: { reference }, include: { user: true } })
      : await prisma.hairRequest.findFirst({ where: { reference }, include: { user: true } });
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(s(record));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/verification/:type/:reference
router.post('/verification/:type/:reference', ...staffOnly, validate(verificationStatusSchema), async (req, res) => {
  try {
    const { type, reference } = req.params;
    const { status, remarks } = req.body;
    const trackableType = type === 'donor' ? DONATION_TYPE : REQUEST_TYPE;
    const record = type === 'donor'
      ? await prisma.donation.findFirst({ where: { reference } })
      : await prisma.hairRequest.findFirst({ where: { reference } });
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }

    if (type === 'donor') await prisma.donation.update({ where: { id: record.id }, data: { status } });
    else await prisma.hairRequest.update({ where: { id: record.id }, data: { status } });
    await createStatusHistory(trackableType, record.id, status, remarks);
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
    const wps = await prisma.wigProduction.findMany({
      where: { donationId: { in: donations.map(d => d.id) } }, include: { wigmaker: true },
    });
    const wpMap: Record<string, any> = {};
    for (const wp of wps) wpMap[wp.donationId!.toString()] = s(wp);
    const requests = await prisma.hairRequest.findMany({
      where: { status: { in: ['Validated', 'In Production', 'Matched', 'In Transit', 'Arrived', 'Completed'] } },
      include: { user: true }, orderBy: { updatedAt: 'desc' },
    });
    res.json({ donations: s(donations), requests: s(requests), wigmakers: s(wigmakers), wigProductions: wpMap });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/assign-wigmaker/:reference
router.post('/assign-wigmaker/:reference', ...staffOnly, validate(assignWigmakerSchema), async (req, res) => {
  try {
    const donation = await prisma.donation.findFirst({ where: { reference: req.params.reference } });
    if (!donation) { res.status(404).json({ message: 'Not found' }); return; }
    if (donation.status !== 'Received Hair') { res.status(422).json({ message: 'Hair not received yet.', success: false }); return; }
    const wm = await prisma.user.findFirst({ where: { id: BigInt(req.body.wigmaker_id), role: 'wigmaker' } });
    if (!wm) { res.status(404).json({ message: 'Wigmaker not found' }); return; }
    const tc = 'WG-' + crypto.createHash('md5').update(donation.reference + Date.now()).digest('hex').substring(0, 6).toUpperCase();
    const due = new Date(); due.setDate(due.getDate() + 30);
    await prisma.wigProduction.create({ data: { taskCode: tc, wigmakerId: wm.id, donationId: donation.id, targetLength: donation.hairLength, targetColor: donation.hairColor, status: 'assigned', dueDate: due } });
    await prisma.donation.update({ where: { id: donation.id }, data: { status: 'In Queue' } });
    await createStatusHistory(DONATION_TYPE, donation.id, 'In Queue', `Wigmaker: ${wm.firstName} ${wm.lastName}`);
    res.json({ message: `Assigned to ${wm.firstName} ${wm.lastName}.`, success: true, task_code: tc });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/tracking/:reference/status
router.post('/tracking/:reference/status', ...staffOnly, validate(trackingStatusSchema), async (req, res) => {
  try {
    const { reference } = req.params;
    const { status: ns, notes, delivery_tracking_link } = req.body;
    let record: any = await prisma.donation.findFirst({ where: { reference } });
    let isDon = !!record;
    if (!record) record = await prisma.hairRequest.findFirst({ where: { reference } });
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    const tt = isDon ? DONATION_TYPE : REQUEST_TYPE;
    const ud: any = { status: ns };
    if (ns === 'Wig Received') ud.receivedWigAt = new Date();
    if (ns === 'In Transit' && delivery_tracking_link) ud.deliveryTrackingLink = delivery_tracking_link;
    if (ns === 'Received Hair' && isDon && !record.certificateNo) ud.certificateNo = `CERT-${new Date().getFullYear()}-${record.reference.slice(-6)}`;
    if (isDon) await prisma.donation.update({ where: { id: record.id }, data: ud });
    else await prisma.hairRequest.update({ where: { id: record.id }, data: ud });
    await createStatusHistory(tt, record.id, ns, notes || `Status updated to ${ns} by staff`);
    res.json({ message: `Status updated to ${ns}.`, success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/staff/match-wig
router.post('/match-wig', ...staffOnly, validate(matchWigSchema), async (req, res) => {
  try {
    const hr = await prisma.hairRequest.findFirst({ where: { reference: req.body.request_reference } });
    if (!hr) { res.status(404).json({ message: 'Not found' }); return; }
    const wig = await prisma.wigProduction.findUnique({ where: { id: BigInt(req.body.wig_id) } });
    if (!wig) { res.status(404).json({ message: 'Wig not found' }); return; }
    await prisma.hairRequest.update({ where: { id: hr.id }, data: { status: 'Matched' } });
    await createStatusHistory(REQUEST_TYPE, hr.id, 'Matched', `Matched with Wig #${wig.taskCode}`);
    await prisma.wigProduction.update({ where: { id: wig.id }, data: { hairRequestId: hr.id, status: 'matched' } });
    res.json({ message: `Matched with Wig #${wig.taskCode}.`, success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/hair-stock
router.get('/hair-stock', ...staffOnly, async (_req, res) => {
  try {
    const dons = await prisma.donation.findMany({ where: { status: 'Completed' } });
    const stock: Record<string, Record<string, number>> = { Short: { Black: 0, Brown: 0, Light: 0 }, Medium: { Black: 0, Brown: 0, Light: 0 }, Long: { Black: 0, Brown: 0, Light: 0 } };
    for (const d of dons) {
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
    const wigs = await prisma.wigProduction.findMany({ where: { status: 'completed' }, include: { donation: true }, orderBy: { updatedAt: 'desc' }, take: 50 });
    res.json(s(wigs));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/matching-list
router.get('/matching-list', ...staffOnly, async (_req, res) => {
  try {
    const reqs = await prisma.hairRequest.findMany({ where: { status: { in: ['Validated', 'Matched', 'In Transit', 'Arrived'] } }, include: { user: true }, orderBy: { updatedAt: 'desc' } });
    const avail = await prisma.wigProduction.findMany({ where: { status: 'completed', hairRequestId: null } });
    const result = reqs.map(r => {
      if (r.status !== 'Validated') return { ...s(r), best_match: null, match_score: 0 };
      let bw: any = null, ms = -1;
      for (const w of avail) { const sc = calculateCompatibility(r, w); if (sc > ms) { ms = sc; bw = w; } }
      return { ...s(r), best_match: ms > 0 ? s(bw) : null, match_score: ms };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/staff/rule-matching
router.get('/rule-matching', ...staffOnly, async (_req, res) => {
  try {
    const recipients = await prisma.hairRequest.findMany({ where: { status: { in: ['Validated', 'Submitted'] } }, include: { user: true } });
    const wigs = await prisma.wigProduction.findMany({ where: { status: 'completed' }, include: { donation: true } });
    res.json({ recipients: s(recipients), wigs: s(wigs) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
