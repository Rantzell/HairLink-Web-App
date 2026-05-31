import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { notifyDonationStatus } from '../services/notification.service';

const router = Router();

/**
 * Map the granular `Donation` / `HairRequest` status strings the platform
 * uses internally to the coarse Pending / Approved / Rejected tri-state the
 * calendar UI cares about. Keeps the frontend simple and stable even if
 * status names grow over time.
 *
 * IMPORTANT: every status that staff/wigmakers set AFTER acceptance should
 * map to "Approved" so the donor/recipient calendar reflects the moment the
 * submission was approved — not just when it finishes the whole pipeline.
 *
 * Donation statuses (staff-set):  Submitted → Verified → Received Hair →
 *   In Queue → In Progress → Completed → Wig Received
 * HairRequest statuses (staff-set): Submitted → Matched → In Queue →
 *   In Progress → Ready for Pickup → Pickup Confirmed → Completed
 *
 * "Submitted" stays Pending — the user is still waiting for the first
 * staff decision. Everything past that is "Approved" from the user POV.
 */
function toDecision(status: string): 'Pending' | 'Approved' | 'Rejected' {
  const s = (status || '').toLowerCase();
  if (['rejected', 'cancelled', 'declined'].includes(s)) return 'Rejected';
  if ([
    // Donation pipeline
    'approved', 'verified', 'received hair', 'wig received',
    // Request pipeline
    'matched', 'ready for pickup', 'pickup confirmed', 'received',
    // Shared production steps
    'in queue', 'in progress', 'in production', 'shipped',
    'ready', 'validated', 'completed',
  ].includes(s)) return 'Approved';
  return 'Pending';
}

/**
 * GET /api/calendar?year=YYYY&month=MM
 * Unified month view. Returns the caller's own donations *and* every admin
 * event in the month. Designed so the frontend can render a single calendar
 * grid with both dot kinds without a second roundtrip.
 *
 * - `month` is 1-12.
 * - If year/month omitted we default to the current month in the server's TZ.
 * - Auth required (the donation half is per-user).
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = parseInt(String(req.query.year || ''), 10) || now.getUTCFullYear();
    const month = parseInt(String(req.query.month || ''), 10) || (now.getUTCMonth() + 1);

    if (month < 1 || month > 12 || year < 1970 || year > 3000) {
      res.status(400).json({ error: 'Invalid year/month' });
      return;
    }

    // Range covers the full UTC month: [first of month, first of next month).
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const userId = req.user!.id;
    const role = req.user!.role;

    let donationItems: any[] = [];
    let eventItems: any[] = [];

    if (role === 'recipient') {
      const [requests, events] = await Promise.all([
        prisma.hairRequest.findMany({
          where: {
            userId,
            createdAt: { gte: start, lt: end },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            reference: true,
            status: true,
            wigLength: true,
            wigColor: true,
            appointmentAt: true,
            createdAt: true,
          },
        }),
        prisma.event.findMany({
          where: { date: { gte: start, lt: end } },
          orderBy: { date: 'asc' },
        }),
      ]);

      donationItems = requests.map((r) => {
        const when = r.appointmentAt || r.createdAt || new Date();
        return {
          id: `request-${r.id}`,
          kind: 'request' as const,
          title: 'Hair Request',
          subtitle: [r.wigLength, r.wigColor].filter(Boolean).join(' · ') || 'Submitted request',
          location: 'Medical Review',
          date: when.toISOString().slice(0, 10),     // YYYY-MM-DD for calendar grid
          datetime: when.toISOString(),
          status: r.status,
          decision: toDecision(r.status || ''),
          reference: r.reference,
        };
      });

      eventItems = events.map((e) => ({
        id: `event-${e.id}`,
        kind: 'event' as const,
        title: e.title,
        subtitle: e.description || '',
        location: e.location || null,
        date: e.date.toISOString().slice(0, 10),
        datetime: e.date.toISOString(),
        status: e.status,
        decision: null,
        reference: null,
      }));
    } else {
      const [donations, events] = await Promise.all([
        prisma.donation.findMany({
          where: {
            userId,
            createdAt: { gte: start, lt: end },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            reference: true,
            status: true,
            hairLength: true,
            hairColor: true,
            dropoffLocation: true,
            appointmentAt: true,
            createdAt: true,
          },
        }),
        prisma.event.findMany({
          where: { date: { gte: start, lt: end } },
          orderBy: { date: 'asc' },
        }),
      ]);

      donationItems = donations.map((d) => {
        const when = d.appointmentAt || d.createdAt || new Date();
        return {
          id: `donation-${d.id}`,
          kind: 'donation' as const,
          title: 'Hair Donation',
          subtitle: [d.hairLength, d.hairColor].filter(Boolean).join(' · ') || 'Submitted donation',
          location: d.dropoffLocation || null,
          date: when.toISOString().slice(0, 10),     // YYYY-MM-DD for calendar grid
          datetime: when.toISOString(),
          status: d.status,
          decision: toDecision(d.status || ''),
          reference: d.reference,
        };
      });

      eventItems = events.map((e) => ({
        id: `event-${e.id}`,
        kind: 'event' as const,
        title: e.title,
        subtitle: e.description || '',
        location: e.location || null,
        date: e.date.toISOString().slice(0, 10),
        datetime: e.date.toISOString(),
        status: e.status,
        decision: null,
        reference: null,
      }));
    }

    res.json({
      year,
      month,
      donations: donationItems,
      events: eventItems,
      // Pre-merged convenience list, already sorted, that the calendar grid
      // can iterate directly.
      items: [...donationItems, ...eventItems].sort((a, b) =>
        a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0,
      ),
    });
  } catch (err) {
    console.error('[Calendar] Error:', err);
    res.status(500).json({ error: 'Failed to load calendar' });
  }
});

/**
 * PATCH /api/calendar/donations/:reference/decision
 * Admin/staff approve or reject a donation. Thin wrapper over the existing
 * status field so the calendar UI has one obvious verb to call.
 *
 * body: { decision: 'Approved' | 'Rejected', remarks?: string }
 */
router.patch('/donations/:reference/decision', authenticate, async (req: Request, res: Response) => {
  const ADMIN_ROLES = ['admin', 'staff'];
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const decision = String(req.body?.decision || '');
  if (!['Approved', 'Rejected'].includes(decision)) {
    res.status(400).json({ error: "decision must be 'Approved' or 'Rejected'" });
    return;
  }

  try {
    const ref = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
    const donation = await prisma.donation.findFirst({
      where: { reference: String(ref) },
    });
    if (!donation) {
      res.status(404).json({ error: 'Donation not found' });
      return;
    }

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data: { status: decision },
    });

    // Tell the donor we changed their status.
    if (updated.userId) {
      notifyDonationStatus(updated.userId, decision, updated.reference!)
        .catch((e) => console.error('[Calendar] notify failed:', e));
    }

    res.json({
      reference: updated.reference,
      status: updated.status,
      decision: toDecision(updated.status || ''),
    });
  } catch (err) {
    console.error('[Calendar] Decision error:', err);
    res.status(500).json({ error: 'Failed to update donation decision' });
  }
});

export default router;
