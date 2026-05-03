import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { eventCreateSchema } from '../schemas';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];

function s(o: any): any {
  if (o === null || o === undefined) return o;
  if (typeof o === 'bigint') return o.toString();
  if (o instanceof Date) return o;
  if (Array.isArray(o)) return o.map(s);
  if (typeof o === 'object') { const r: any = {}; for (const k of Object.keys(o)) r[k] = s(o[k]); return r; }
  return o;
}

// GET /internal-api/admin/dashboard
router.get('/dashboard', ...adminOnly, async (_req, res) => {
  try {
    const [uc, dc, rc, pd, pr] = await Promise.all([
      prisma.user.count(), prisma.donation.count(), prisma.hairRequest.count(),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
    ]);
    const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    const recentDonations = await prisma.donation.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 5 });
    const recentRequests = await prisma.hairRequest.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 5 });
    const [ad, pdc, rd, ar, prc] = await Promise.all([
      prisma.donation.count({ where: { status: 'Completed' } }),
      prisma.donation.count({ where: { status: { in: ['Submitted', 'Received Hair'] } } }),
      prisma.donation.count({ where: { status: 'Rejected' } }),
      prisma.hairRequest.count({ where: { status: 'Validated' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
    ]);
    const monetaryDonations = await prisma.monetaryDonation.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
    res.json(s({
      usersCount: uc, donationsCount: dc, requestsCount: rc, pendingVerifications: pd + pr,
      recentUsers, recentDonations, recentRequests,
      approvedDonations: ad, pendingDonationsCount: pdc, rejectedDonations: rd,
      approvedRequests: ar, pendingRequestsCount: prc, needsMatchRequests: ar, monetaryDonations,
    }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/users
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const take = 10; const skip = (page - 1) * take;
    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count(),
    ]);
    const [donorCount, recipientCount, staffCount, wigmakerCount] = await Promise.all([
      prisma.user.count({ where: { role: 'donor' } }),
      prisma.user.count({ where: { role: 'recipient' } }),
      prisma.user.count({ where: { role: 'staff' } }),
      prisma.user.count({ where: { role: 'wigmaker' } }),
    ]);
    res.json(s({ users, total, page, totalPages: Math.ceil(total / take), donorCount, recipientCount, staffCount, wigmakerCount }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/admin/users/:id/toggle
router.post('/users/:id/toggle', ...adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    await prisma.user.update({ where: { id: user.id }, data: { isActive: !user.isActive } });
    res.json({ message: user.isActive ? 'User deactivated.' : 'User activated.', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/events
router.get('/events', ...adminOnly, async (_req, res) => {
  try {
    const upcoming = await prisma.event.findMany({ where: { status: 'Upcoming' }, orderBy: { date: 'asc' } });
    const past = await prisma.event.findMany({ where: { status: 'Completed' }, orderBy: { date: 'desc' } });
    res.json(s({ upcomingEvents: upcoming, pastEvents: past }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/admin/events
router.post('/events', ...adminOnly, validate(eventCreateSchema), async (req, res) => {
  try {
    await prisma.event.create({
      data: { title: req.body.event_title, date: new Date(req.body.event_date), description: req.body.event_description || '', location: req.body.event_location || '', status: 'Upcoming', participantsCount: 0 },
    });
    res.json({ message: 'Event created successfully', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/community
router.get('/community', ...adminOnly, async (_req, res) => {
  try {
    const posts = await prisma.communityPost.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = await prisma.communityPost.count({ where: { createdAt: { gte: weekAgo } } });
    res.json(s({ posts, recentCount }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /internal-api/admin/community/:id
router.delete('/community/:id', ...adminOnly, async (req, res) => {
  try {
    await prisma.communityPost.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/reports
router.get('/reports', ...adminOnly, async (_req, res) => {
  try {
    const [dc, rc, wd, uc, ec] = await Promise.all([
      prisma.donation.count(), prisma.hairRequest.count(),
      prisma.wigProduction.count({ where: { status: 'completed' } }),
      prisma.user.count(), prisma.event.count(),
    ]);
    const mt = await prisma.monetaryDonation.aggregate({ where: { status: 'Completed' }, _sum: { amount: true } });
    const rs = await prisma.hairRequest.count({ where: { status: { in: ['Validated', 'Matched', 'Completed'] } } });
    res.json(s({ donationsCount: dc, requestsCount: rc, wigsDistributed: wd, usersCount: uc, monetaryTotal: mt._sum.amount || 0, eventsCount: ec, recipientsServed: rs }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/inventory
router.get('/inventory', ...adminOnly, async (_req, res) => {
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
    const wigStock = await prisma.wigProduction.findMany({ where: { status: 'completed' }, include: { donation: true, wigmaker: true }, orderBy: { updatedAt: 'desc' } });
    const allDons = await prisma.donation.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    res.json(s({ stock, totalHairRecords: dons.length, wigStock, wigCount: wigStock.length, allDonations: allDons, allDonationsCount: allDons.length }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/verification, matching, operations — similar patterns
router.get('/verification', ...adminOnly, async (_req, res) => {
  try {
    const pd = await prisma.donation.findMany({ where: { status: { in: ['Received Hair', 'Submitted'] } }, include: { user: true } });
    const pr = await prisma.hairRequest.findMany({ where: { status: 'Submitted' }, include: { user: true } });
    res.json(s({ pendingDonations: pd, pendingRequests: pr }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/matching', ...adminOnly, async (_req, res) => {
  try {
    const ad = await prisma.donation.findMany({ where: { status: 'Completed' }, include: { user: true } });
    const ar = await prisma.hairRequest.findMany({ where: { status: 'Validated' }, include: { user: true } });
    const cw = await prisma.wigProduction.findMany({ where: { status: 'completed' }, include: { donation: true } });
    res.json(s({ availableDonations: ad, approvedRequests: ar, completedWigs: cw, readyToMatch: ar.length, allocatedWigs: cw.length }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/operations', ...adminOnly, async (_req, res) => {
  try {
    const [sc, wt, tc, cc, pd, pr, aw, at] = await Promise.all([
      prisma.user.count({ where: { role: 'staff' } }), prisma.wigProduction.count(),
      prisma.wigProduction.count({ where: { status: 'processing' } }),
      prisma.wigProduction.count({ where: { status: 'completed' } }),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
      prisma.user.count({ where: { role: 'wigmaker' } }),
      prisma.wigProduction.count({ where: { status: { in: ['assigned', 'processing'] } } }),
    ]);
    res.json({ staffCount: sc, wigTasksCount: wt, transitCount: tc, completedCount: cc, pendingDonationsCount: pd, pendingRequestsCount: pr, activeWigmakers: aw, activeWigTasks: at });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
