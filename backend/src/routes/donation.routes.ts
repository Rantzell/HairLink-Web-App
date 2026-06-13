import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { donationCreateSchema, donationStatusSchema, deliveryLinkSchema, scheduleDeliverySchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile, getPublicUrl } from '../services/storage.service';
import { notifyDonationStatus, notifyStaffNewDonation, notifyStaffDeliveryScheduled } from '../services/notification.service';
import { generateSequentialReference } from '../services/reference.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const DONATION_TYPE = 'App\\Models\\Donation';

function serializeDonation(d: any) {
  return { ...d, id: d.id.toString(), userId: d.userId?.toString() || null, user: d.user ? { ...d.user, id: d.user.id.toString() } : undefined };
}

// GET /internal-api/donations
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { userId: req.user!.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const donationIds = donations.map((d) => d.id);

    // Fetch all status histories for these donations in one query
    const allStatusHistories = donationIds.length > 0
      ? await prisma.statusHistory.findMany({
          where: {
            trackableType: DONATION_TYPE,
            trackableId: { in: donationIds },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Group status histories by trackableId
    const historiesByDonationId = allStatusHistories.reduce((acc: any, history) => {
      const id = history.trackableId;
      if (!acc[id]) acc[id] = [];
      acc[id].push(history);
      return acc;
    }, {});

    const result = donations.map((d) => {
      const statusHistories = historiesByDonationId[d.id] || [];
      return { ...serializeDonation(d), statusHistories };
    });

    res.json(result);
  } catch (err) {
    console.error('[Donation] Get error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch donations',
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

// POST /internal-api/donations
router.post('/', authenticate, upload.fields([
  { name: 'photo_front', maxCount: 1 },
  { name: 'photo_side', maxCount: 1 },
]), validate(donationCreateSchema), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let photoFront: string | null = null;
    let photoSide: string | null = null;

    if (files?.photo_front?.[0]) {
      photoFront = await uploadFile(files.photo_front[0], 'hairlink', 'donations/photos');
    }
    if (files?.photo_side?.[0]) {
      photoSide = await uploadFile(files.photo_side[0], 'hairlink', 'donations/photos');
    }

    // Reject past appointment dates
    if (req.body.appointment_at) {
      const appt = new Date(req.body.appointment_at);
      if (appt < new Date()) {
        res.status(422).json({ error: 'Appointment date cannot be in the past.' });
        return;
      }
    }

    const newReference = await generateSequentialReference('HD');

    const donation = await prisma.donation.create({
      data: {
        userId: req.user!.id,
        reference: newReference,
        hairLength: req.body.hair_length,
        hairColor: req.body.hair_color,
        treatedHair: req.body.treated_hair === 'true' || req.body.treated_hair === true || req.body.treated_hair === '1',
        address: req.body.address || null,
        reason: req.body.reason || null,
        dropoffLocation: req.body.dropoff_location || null,
        appointmentAt: req.body.appointment_at ? new Date(req.body.appointment_at) : null,
        photoFront: photoFront,
        photoSide: photoSide,
        status: 'Submitted',
      },
    });

    await createStatusHistory(DONATION_TYPE, donation.id, 'Submitted');
    // Confirm to the donor that we got their submission.
    await notifyDonationStatus(req.user!.id, 'Submitted', donation.reference!);
    // Notify staff about the new donation
    await notifyStaffNewDonation(req.user!.name || 'A donor', donation.reference!);
    res.status(201).json(serializeDonation(donation));
  } catch (err) {
    console.error('[Donation] Create error:', err);
    res.status(500).json({ 
      error: 'Failed to create donation', 
      message: err instanceof Error ? err.message : String(err) 
    });
  }
});

// GET /internal-api/donations/stats
//
// Star-point rules:
//   • Hair donations are worth 10 pts each, but ONLY after staff confirms
//     the hair was physically received. A submitted-but-unverified donation
//     is worth zero. Statuses that count: 'Received Hair', 'In Queue',
//     'In Production', 'In Progress', 'Completed', 'Wig Received'.
//   • Referrals: 5 pts per referred user (any time).
//   • Monetary: NO LONGER credited. Monetary donations are tracked for
//     reporting/transparency only and do not award Star Points. (Product
//     decision — donors shouldn't feel "paid" for paying.)
//
// `pendingHairDonations` / `pendingMonetaryAmount` are returned alongside so
// the dashboard can show "X donation(s) awaiting verification".
const RECEIVED_HAIR_STATUSES = [
  'Received Hair',
  'In Queue',
  'In Production',
  'In Progress',
  'Completed',
  'Wig Received',
];

const VERIFIED_MONETARY_STATUSES = ['Approved', 'Verified', 'Completed'];

router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`[Stats] Fetching for user: ${userId}`);

    // 1. Hair donations — credited only once received.
    const [receivedHairCount, submittedHairCount] = await Promise.all([
      prisma.donation.count({
        where: { userId, status: { in: RECEIVED_HAIR_STATUSES } },
      }),
      prisma.donation.count({ where: { userId } }),
    ]);
    const pendingHairDonations = Math.max(0, submittedHairCount - receivedHairCount);

    // 2. Referrals — always credited.
    //    `referralsGiven`   → people who used MY code (I'm the referrer, +5 each)
    //    `referredByOther`  → I used someone else's code (+3, once)
    const referrals = await prisma.user.count({
      where: { referredBy: userId },
    });
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true },
    });
    const referredByOther = me?.referredBy ? 1 : 0;

    // 3. Monetary — only verified totals count.
    const [verifiedMonetary, allMonetary] = await Promise.all([
      prisma.monetaryDonation.aggregate({
        where: { userId, status: { in: VERIFIED_MONETARY_STATUSES } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.monetaryDonation.aggregate({
        where: { userId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const verifiedAmount = Number(verifiedMonetary._sum.amount || 0);
    const verifiedCount = verifiedMonetary._count || 0;
    const pendingMonetaryAmount = Math.max(0, Number(allMonetary._sum.amount || 0) - verifiedAmount);
    // Monetary donations no longer award stars (product decision).
    // Kept the variable for backwards-compat with API consumers but it is
    // always 0 — every existing client that reads `monetaryPoints` will
    // simply see 0 instead of breaking.
    const monetaryPoints = 0;

    const totalPoints =
      (receivedHairCount * 10) +
      (referrals * 5) +
      (referredByOther * 3);

    console.log(`[Stats] User ${userId}: ReceivedHair=${receivedHairCount}(pending ${pendingHairDonations}), Ref=${referrals}, Redeemed=${referredByOther}, MonAmt=${verifiedAmount}(pending ₱${pendingMonetaryAmount}), Total=${totalPoints}`);

    res.json({
      totalPoints,
      breakdown: {
        // hairDonations now reflects RECEIVED donations only, since that's
        // what the points are derived from.
        hairDonations: receivedHairCount,
        pendingHairDonations,
        referrals,
        referredByOther,
        monetaryAmount: verifiedAmount,
        monetaryCount: verifiedCount,
        monetaryPoints,
        pendingMonetaryAmount,
      },
    });
  } catch (err) {
    console.error('[Donation] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /internal-api/donations/:reference
router.get('/:reference', authenticate, async (req: Request, res: Response) => {
  try {
    const donation = await prisma.donation.findFirst({
      where: { reference: req.params.reference as string, userId: req.user!.id },
      include: { user: true },
    });
    if (!donation) { res.status(404).json({ message: 'Donation not found' }); return; }
    const statusHistories = await getStatusHistories(DONATION_TYPE, donation.id);
    res.json({ ...serializeDonation(donation), statusHistories });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch donation' }); }
});

// POST /internal-api/donations/:reference/status
router.post('/:reference/status', authenticate, validate(donationStatusSchema), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where: any = { reference: req.params.reference };
    if (!['staff', 'admin'].includes(user.role)) where.userId = user.id;

    const donation = await prisma.donation.findFirst({ where });
    if (!donation) { res.status(404).json({ message: 'Donation not found' }); return; }

    const newStatus = req.body.status;
    if (donation.status !== newStatus) {
      const updateData: any = { status: newStatus };

      if (newStatus === 'Received Hair' && !donation.certificateNo) {
        updateData.certificateNo = `CERT-${new Date().getFullYear()}-${(donation.reference as string).slice(-6)}`;
      }
      if (newStatus === 'Wig Received') {
        updateData.receivedWigAt = new Date();
      }

      await prisma.donation.update({ where: { id: donation.id }, data: updateData });
      await createStatusHistory(DONATION_TYPE, donation.id, newStatus, req.body.remarks);

      const { notifyDonationStatus } = await import('../services/notification.service');
      if (donation.userId) await notifyDonationStatus(donation.userId, newStatus, donation.reference!);

      // Milestone: the donor earns points the moment staff confirms the hair
      // was physically received. Award here so a re-PUT of an already-received
      // donation does NOT double-credit (guarded by `donation.status !== newStatus`).
      if (newStatus === 'Received Hair' && donation.userId) {
        const { addMilestonePoints, POINTS } = await import('../services/milestone.service');
        await addMilestonePoints(donation.userId, POINTS.HAIR_RECEIVED);
      }
    }

    const updated = await prisma.donation.findUnique({ where: { id: donation.id }, include: { user: true } });
    const statusHistories = await getStatusHistories(DONATION_TYPE, donation.id);
    res.json({ ...serializeDonation(updated), statusHistories });
  } catch (err) {
    console.error('[Donation] Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /internal-api/donations/:reference/schedule-delivery
router.post('/:reference/schedule-delivery', authenticate, validate(scheduleDeliverySchema), async (req: Request, res: Response) => {
  try {
    const donation = await prisma.donation.findFirst({
      where: { reference: req.params.reference as string, userId: req.user!.id },
    });
    if (!donation) { res.status(404).json({ message: 'Donation not found' }); return; }
    if (donation.status !== 'Verified') {
      res.status(422).json({ error: 'Delivery can only be scheduled for verified donations.' });
      return;
    }

    const scheduledAt = new Date(req.body.scheduled_delivery_at);
    
    // Compare date-only (allow same-day scheduling)
    const now = new Date();
    const todayDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
    const scheduledDate = new Date(scheduledAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
    if (scheduledDate < todayDate) {
      res.status(422).json({ error: 'Scheduled date cannot be in the past.' });
      return;
    }

    // Enforce working hours: scheduling is only allowed between 8 AM and 4 PM PHT
    const phtHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours();
    if (phtHour < 8 || phtHour >= 16) {
      res.status(422).json({ error: 'Scheduling is only available during working hours (8:00 AM – 4:00 PM).' });
      return;
    }

    await prisma.donation.update({
      where: { id: donation.id },
      data: { scheduledDeliveryAt: scheduledAt, deliveryDueNotified: false },
    });

    const when = scheduledAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await createStatusHistory(DONATION_TYPE, donation.id, donation.status!, `Donor scheduled hair delivery for ${when}.`);
    await notifyStaffDeliveryScheduled(req.user!.name || 'A donor', donation.reference!, scheduledAt);

    const updated = await prisma.donation.findUnique({ where: { id: donation.id }, include: { user: true } });
    const statusHistories = await getStatusHistories(DONATION_TYPE, donation.id);
    res.json({ ...serializeDonation(updated), statusHistories });
  } catch (err) { res.status(500).json({ error: 'Failed to schedule delivery' }); }
});

// POST /internal-api/donations/:reference/delivery-link
router.post('/:reference/delivery-link', authenticate, validate(deliveryLinkSchema), async (req: Request, res: Response) => {
  try {
    const donation = await prisma.donation.findFirst({
      where: { reference: req.params.reference as string, userId: req.user!.id },
    });
    if (!donation) { res.status(404).json({ message: 'Donation not found' }); return; }

    await prisma.donation.update({
      where: { id: donation.id },
      data: { donorDeliveryLink: req.body.donor_delivery_link },
    });

    const updated = await prisma.donation.findUnique({ where: { id: donation.id }, include: { user: true } });
    const statusHistories = await getStatusHistories(DONATION_TYPE, donation.id);
    res.json({ ...serializeDonation(updated), statusHistories });
  } catch (err) { res.status(500).json({ error: 'Failed to update delivery link' }); }
});


export default router;
