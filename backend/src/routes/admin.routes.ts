import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { eventCreateSchema } from '../schemas';
import { notifyAllDonorsAndRecipients, notifyAnnouncement } from '../services/notification.service';


const router = Router();
const adminOnly = [authenticate, requireRole('admin')];
const adminOrStaff = [authenticate, requireRole('admin', 'staff')];

function s(o: any): any {
  if (o === null || o === undefined) return o;
  if (typeof o === 'bigint') return o.toString();
  // Handle Prisma Decimal (which has a d property and a toFixed method)
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

// GET /internal-api/admin/dashboard
router.get('/dashboard', ...adminOrStaff, async (_req, res) => {
  try {
    const [uc, dc, rc, pd, pr, sd] = await Promise.all([
      prisma.user.count(), prisma.donation.count(), prisma.hairRequest.count(),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
      prisma.donation.count({ where: { status: 'Submitted' } }),
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
      usersCount: uc, donationsCount: dc, requestsCount: rc, pendingVerifications: pd + pr + sd,
      recentUsers, recentDonations, recentRequests,
      approvedDonations: ad, pendingDonationsCount: pdc, rejectedDonations: rd,
      approvedRequests: ar, pendingRequestsCount: prc, needsMatchRequests: ar, monetaryDonations,
    }));
  } catch (err: any) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// GET /internal-api/admin/users
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    console.log('[Admin API] Fetching users list...', req.query);
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string;
    const roleParam = req.query.role as string;
    const take = 10; const skip = (page - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleParam && roleParam !== 'all') {
      where.role = roleParam;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    // Enhance users with displayName fallback
    const enhancedUsers = users.map(u => ({
      ...u,
      displayName: (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || u.email)
    }));

    const [donorCount, recipientCount, staffCount, wigmakerCount] = await Promise.all([
      prisma.user.count({ where: { role: 'donor' } }),
      prisma.user.count({ where: { role: 'recipient' } }),
      prisma.user.count({ where: { role: 'staff' } }),
      prisma.user.count({ where: { role: 'wigmaker' } }),
    ]);
    console.log('[Admin API] Users fetched successfully, total:', total);
    res.json(s({ users: enhancedUsers, total, page, totalPages: Math.ceil(total / take), donorCount, recipientCount, staffCount, wigmakerCount }));
  } catch (err: any) { 
    console.error('[Admin API] Error fetching users:', err);
    res.status(500).json({ error: 'Failed', message: err.message }); 
  }
});

// POST /internal-api/admin/users
router.post('/users', ...adminOnly, async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, name } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        role: role || 'donor',
        firstName,
        lastName,
        name: name || `${firstName} ${lastName}`,
        isActive: true
      }
    });
    res.status(201).json(s(user));
  } catch (err: any) { res.status(500).json({ error: 'Failed', message: err.message }); }
});

// PUT /internal-api/admin/users/:id
router.put('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const { email, role, firstName, lastName, name, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { email, role, firstName, lastName, name, isActive }
    });
    res.json(s(user));
  } catch (err: any) { res.status(500).json({ error: 'Failed', message: err.message }); }
});

// PATCH /internal-api/admin/users/:id/toggle-active
router.patch('/users/:id/toggle-active', ...adminOnly, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    await prisma.user.update({ where: { id: user.id }, data: { isActive: !user.isActive } });
    res.json({ message: user.isActive ? 'User deactivated.' : 'User activated.', success: true });
  } catch (err: any) { 
    console.error('[Admin API] /community error:', err);
    res.status(500).json({ error: 'Failed', message: err?.message || String(err) });
  }
});

// GET /internal-api/admin/events
router.get('/events', ...adminOnly, async (_req, res) => {
  try {
    const now = new Date();
    // Backfill stored status so other queries (admin listing by status, reports)
    // also reflect that the event has ended.
    await prisma.event.updateMany({
      where: { date: { lt: now }, status: 'Upcoming' },
      data: { status: 'Completed' },
    });
    const upcoming = await prisma.event.findMany({
      where: { date: { gte: now }, NOT: { status: 'Cancelled' } },
      orderBy: { date: 'asc' },
    });
    const past = await prisma.event.findMany({
      where: { date: { lt: now } },
      orderBy: { date: 'desc' },
    });
    res.json(s({ upcomingEvents: upcoming, pastEvents: past }));
  } catch (err: any) { console.error('[Admin API] GET /events error:', err); res.status(500).json({ error: 'Failed', message: err?.message || String(err) }); }
});

// POST /internal-api/admin/events
router.post('/events', ...adminOnly, validate(eventCreateSchema), async (req, res) => {
  try {
    const dateObj = new Date(req.body.event_date);
    if (dateObj < new Date()) {
      res.status(422).json({ error: 'Event date cannot be in the past.' });
      return;
    }
    const status = 'Upcoming';
    const created = await prisma.event.create({
      data: {
        title: req.body.event_title,
        date: dateObj,
        description: req.body.event_description || '',
        location: req.body.event_location || '',
        status,
        participantsCount: 0,
      },
    });
    // Broadcast to every active donor + recipient so it shows up in their
    // notification feed and on the mobile UPCOMING EVENT card.
    try {
      const { notifyNewEvent } = await import('../services/notification.service');
      const count = await notifyNewEvent(created.title, created.date, created.location);
      console.log(`[Admin] Broadcast new event to ${count} users`);
    } catch (notifyErr) {
      console.error('[Admin] Failed to broadcast event:', notifyErr);
    }
    res.json({ message: 'Event created successfully', success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// PUT /internal-api/admin/events/:id
router.put('/events/:id', ...adminOnly, validate(eventCreateSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { event_title, event_date, event_description, event_location } = req.body;

    const dateObj = new Date(event_date);
    if (dateObj < new Date()) {
      res.status(422).json({ error: 'Event date cannot be in the past.' });
      return;
    }
    const status = 'Upcoming';

    const ev = await prisma.event.update({
      where: { id },
      data: {
        title: event_title,
        date: dateObj,
        description: event_description || '',
        location: event_location || '',
        status
      }
    });
    res.json({ message: 'Event updated successfully', success: true, event: s(ev) });
  } catch (err: any) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});


// GET /internal-api/admin/community
router.get('/community', ...adminOnly, async (_req, res) => {
  try {
    // Fetch all community posts with user details (be defensive: if the query fails, continue with empty list)
    let postsRaw: any[] = [];
    try {
      postsRaw = await (prisma.communityPost as any).findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    } catch (dbErr: any) {
      console.error('[Admin API] community.findMany failed, returning empty posts:', dbErr);
      postsRaw = [];
    }
    // Normalize nested user ids and dates to avoid serialization/runtime issues in the admin UI
    const posts = (postsRaw || []).map((p: any) => ({
      ...p,
      user: p.user ? { ...p.user, id: p.user.id?.toString ? p.user.id.toString() : p.user.id } : undefined,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    }));
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    let recentCount = 0;
    try {
      recentCount = await prisma.communityPost.count({ where: { createdAt: { gte: weekAgo } } });
    } catch (cntErr: any) {
      console.error('[Admin API] community.count failed, defaulting recentCount to 0:', cntErr);
      recentCount = 0;
    }
    res.json({ posts, recentCount });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /internal-api/admin/community/:id
router.delete('/community/:id', ...adminOnly, async (req, res) => {
  try {
    await prisma.communityPost.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Post deleted', success: true });
  } catch (err: any) {
    console.error('[Admin API] DELETE /community/:id error:', err);
    res.status(500).json({ error: 'Failed', message: err?.message || String(err) });
  }
});

// GET /internal-api/admin/partnerships
router.get('/partnerships', ...adminOnly, async (_req, res) => {
  try {
    const list = await prisma.partnership.findMany({ orderBy: { name: 'asc' } });
    res.json(s(list));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/admin/partnerships
router.post('/partnerships', ...adminOnly, async (req, res) => {
  try {
    const { name, type, contact, email, description, status } = req.body;
    const p = await prisma.partnership.create({ data: { name, type, contact, email, description, status } });
    res.status(201).json(s(p));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// PUT /internal-api/admin/partnerships/:id
router.put('/partnerships/:id', ...adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
    const { name, type, contact, email, description, status } = req.body;
    const p = await prisma.partnership.update({
      where: { id },
      data: { name, type, contact, email, description, status },
    });
    res.json(s(p));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /internal-api/admin/partnerships/:id
router.delete('/partnerships/:id', ...adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    await prisma.partnership.delete({ where: { id } });
    res.json({ message: 'Partnership deleted successfully', success: true });
  } catch (err: any) {
    console.error('Error deleting partnership:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// POST /internal-api/admin/partnerships/bulk-delete
router.post('/partnerships/bulk-delete', ...adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs list' });
    }
    const numericIds = ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
    await prisma.partnership.deleteMany({
      where: {
        id: { in: numericIds }
      }
    });
    res.json({ message: 'Partnerships deleted successfully', success: true });
  } catch (err: any) {
    console.error('Error bulk deleting partnerships:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// GET /internal-api/admin/announcements
router.get('/announcements', ...adminOnly, async (_req, res) => {
  try {
    const list = await prisma.haircareArticle.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(s(list));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /internal-api/admin/announcements
router.post('/announcements', ...adminOnly, async (req, res) => {
  try {
    const { title, content, category, author, target_audience = 'all' } = req.body;
    const a = await prisma.haircareArticle.create({
      data: { title, content, category, author, targetAudience: target_audience }
    });

    // Broadcast only to the selected audience
    await notifyAnnouncement(title, content, target_audience);

    res.status(201).json(s(a));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /internal-api/admin/announcements/:id
router.delete('/announcements/:id', ...adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
    await prisma.haircareArticle.delete({ where: { id } });
    res.json({ message: 'Announcement deleted successfully', success: true });
  } catch (err: any) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// POST /internal-api/admin/announcements/bulk-delete
router.post('/announcements/bulk-delete', ...adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs list' });
    }
    const numericIds = ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
    await prisma.haircareArticle.deleteMany({
      where: {
        id: { in: numericIds }
      }
    });
    res.json({ message: 'Announcements deleted successfully', success: true });
  } catch (err: any) {
    console.error('Error bulk deleting announcements:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// GET /internal-api/admin/reports
router.get('/reports', ...adminOrStaff, async (_req, res) => {
  try {
    const [dc, rc, wd, uc, ec] = await Promise.all([
      prisma.donation.count(), prisma.hairRequest.count(),
      // Wigs distributed are those assigned to a request
      prisma.wigProduction.count({ where: { hairRequestId: { not: null }, taskCode: { contains: '-W' } } }),
      prisma.user.count(), prisma.event.count(),
    ]);
    const mt = await prisma.monetaryDonation.aggregate({ where: { status: { not: 'Rejected' } }, _sum: { amount: true } });
    
    // Recipients served and fulfilled requests include all requests that have been matched with a wig or beyond
    const matchedStatuses = ['Matched', 'Ready for Pickup', 'Pickup Confirmed', 'In Transit', 'Arrived', 'Completed'];
    const rs = await prisma.hairRequest.count({ where: { status: { in: matchedStatuses } } });
    const fulfilledRequests = await prisma.hairRequest.findMany({
      where: { status: { in: matchedStatuses } },
      include: { user: true, wigProductions: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(s({
      donationsCount: dc,
      requestsCount: rc,
      wigsDistributed: wd,
      usersCount: uc,
      monetaryTotal: mt._sum.amount || 0,
      eventsCount: ec,
      recipientsServed: rs,
      fulfilledRequests,
    }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});



// GET /internal-api/admin/reports/monetary
router.get('/reports/monetary', ...adminOrStaff, async (_req, res) => {
  try {
    const donations = await prisma.monetaryDonation.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    res.json(s(donations));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /internal-api/admin/inventory
router.get('/inventory', ...adminOrStaff, async (_req, res) => {
  try {
    const dons = await prisma.donation.findMany({ where: { status: 'Received Hair' } });
    // Buckets must align with the donor-facing form (Short 10–14", Long 15+")
    // and the officially supported wig colors (Black, Brown, Light) so the
    // admin UI numbers actually reflect the inventory.
    const stock: Record<string, Record<string, number>> = {
      Short: { Black: 0, Brown: 0, Light: 0 },
      Long:  { Black: 0, Brown: 0, Light: 0 },
    };

    for (const d of dons) {
      if (!d.hairLength || !d.hairColor) continue;

      // Categorize length — anything < 15 inches is Short, everything else is Long.
      let l: 'Short' | 'Long' = 'Short';
      const lenStr = d.hairLength.toLowerCase();
      const lenNum = parseInt(lenStr, 10);
      if (lenStr.includes('long') || (!Number.isNaN(lenNum) && lenNum >= 15)) l = 'Long';
      else l = 'Short';

      // Categorize color — collapse all donated shades into the supported set
      // so historic Gray / Blonde / Other entries are still counted.
      const raw = (d.hairColor || '').toLowerCase();
      let c: 'Black' | 'Brown' | 'Light' = 'Black';
      if (raw.includes('brown')) c = 'Brown';
      else if (raw.includes('light') || raw.includes('blonde') || raw.includes('gray') || raw.includes('grey') || raw.includes('white')) c = 'Light';
      else c = 'Black';

      stock[l][c]++;
    }

    // Wigs in stock = completed by wigmaker or received by staff, not yet shipped to a recipient.
    const wigStock = await prisma.wigProduction.findMany({
      where: { 
        status: { in: ['completed', 'received'] },
        taskCode: { contains: '-W' } // Exclude parent batches
      },
      include: { wigmaker: true, hairRequest: true },
      orderBy: { updatedAt: 'desc' },
    });
    const allDons = await prisma.donation.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
    res.json(s({ stock, totalHairRecords: dons.length, wigStock, wigCount: wigStock.length, allDonations: allDons, allDonationsCount: allDons.length }));
  } catch (err: any) {
    console.error('Inventory Error:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// GET /internal-api/admin/verification, matching, operations — similar patterns
router.get('/verification', ...adminOnly, async (_req, res) => {
  try {
    const pd = await prisma.donation.findMany({ where: { status: { in: ['Received Hair', 'Submitted'] } }, include: { user: true } });
    const pr = await prisma.hairRequest.findMany({ where: { status: 'Submitted' }, include: { user: true } });
    res.json(s({ pendingDonations: pd, pendingRequests: pr }));
  } catch (err: any) { res.status(500).json({ error: 'Failed', message: err.message }); }
});

router.get('/matching', ...adminOnly, async (_req, res) => {
  try {
    const ad = await prisma.donation.findMany({ where: { status: 'Completed' }, include: { user: true } });
    const ar = await prisma.hairRequest.findMany({ where: { status: 'Validated' }, include: { user: true } });
    // For matching overview we don't require the full donations relation — omit
    // it to avoid runtime include errors and reduce query cost.
    const cw = await prisma.wigProduction.findMany({ where: { status: { in: ['completed', 'received'] }, taskCode: { contains: '-W' } }, include: { wigmaker: true, hairRequest: true } });
    res.json(s({ availableDonations: ad, approvedRequests: ar, completedWigs: cw, readyToMatch: ar.length, allocatedWigs: cw.length }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/operations', ...adminOnly, async (_req, res) => {
  try {
    const [sc, wt, tc, cc, pd, pr, aw, at] = await Promise.all([
      prisma.user.count({ where: { role: 'staff' } }),
      prisma.wigProduction.count({ where: { taskCode: { contains: '-W' } } }),
      // "In Transit" = wigs that have been shipped to recipients but not yet received.
      prisma.wigProduction.count({ where: { status: 'shipped', taskCode: { contains: '-W' } } }),
      prisma.wigProduction.count({ where: { status: { in: ['completed', 'received'] }, taskCode: { contains: '-W' } } }),
      prisma.donation.count({ where: { status: 'Received Hair' } }),
      prisma.hairRequest.count({ where: { status: 'Submitted' } }),
      prisma.user.count({ where: { role: 'wigmaker' } }),
      prisma.wigProduction.count({ where: { status: { in: ['assigned', 'processing'] }, taskCode: { contains: '-W' } } }),
    ]);
    res.json({ staffCount: sc, wigTasksCount: wt, transitCount: tc, completedCount: cc, pendingDonationsCount: pd, pendingRequestsCount: pr, activeWigmakers: aw, activeWigTasks: at });
  } catch (err: any) {
    console.error('Admin Operations Error:', err);
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});



// GET /internal-api/admin/site-settings
router.get('/site-settings', ...adminOnly, async (_req, res) => {
  try {
    const rows = await (prisma as any).siteSetting.findMany();
    const map: Record<string, any> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// PUT /internal-api/admin/site-settings
// Body: { key: string, value: any }[]  — upserts each entry
router.put('/site-settings', ...adminOnly, async (req, res) => {
  try {
    const entries: { key: string; value: any }[] = req.body;
    if (!Array.isArray(entries)) {
      res.status(400).json({ error: 'Body must be an array of { key, value }' });
      return;
    }
    await Promise.all(
      entries.map((e) =>
        (prisma as any).siteSetting.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        })
      )
    );
    res.json({ message: 'Settings saved', success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', message: err.message });
  }
});

// Schema sync complete
export default router;
