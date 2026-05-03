import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { donationCreateSchema, donationStatusSchema, deliveryLinkSchema } from '../schemas';
import { createStatusHistory, getStatusHistories } from '../services/statusHistory.service';
import { uploadFile, getPublicUrl } from '../services/storage.service';

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
    // Attach status histories for each donation
    const result = await Promise.all(donations.map(async (d) => {
      const statusHistories = await getStatusHistories(DONATION_TYPE, d.id);
      return { ...serializeDonation(d), statusHistories };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch donations' }); }
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

    const donation = await prisma.donation.create({
      data: {
        userId: req.user!.id,
        reference: req.body.reference,
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
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // 1. Hair Donations: 10 points per completed donation
    const completedDonations = await prisma.donation.count({
      where: { userId, status: 'Completed' }
    });
    
    // 2. Referrals: 5 points per referred user
    const referrals = await prisma.user.count({
      where: { referredBy: userId }
    });
    
    // 3. Monetary: 1 point per 100 PHP (completed)
    const monetary = await prisma.monetaryDonation.aggregate({
      where: { userId, status: 'Completed' },
      _sum: { amount: true }
    });
    
    const monetaryAmount = Number(monetary._sum.amount || 0);
    const monetaryPoints = Math.floor(monetaryAmount / 100);
    
    const totalPoints = (completedDonations * 10) + (referrals * 5) + monetaryPoints;
    
    res.json({
      totalPoints,
      breakdown: {
        hairDonations: completedDonations,
        referrals,
        monetaryAmount,
        monetaryPoints
      }
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
      where: { reference: req.params.reference, userId: req.user!.id },
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
        updateData.certificateNo = `CERT-${new Date().getFullYear()}-${donation.reference.slice(-6)}`;
      }
      if (newStatus === 'Wig Received') {
        updateData.receivedWigAt = new Date();
      }

      await prisma.donation.update({ where: { id: donation.id }, data: updateData });
      await createStatusHistory(DONATION_TYPE, donation.id, newStatus, req.body.remarks);
    }

    const updated = await prisma.donation.findUnique({ where: { id: donation.id }, include: { user: true } });
    const statusHistories = await getStatusHistories(DONATION_TYPE, donation.id);
    res.json({ ...serializeDonation(updated), statusHistories });
  } catch (err) {
    console.error('[Donation] Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /internal-api/donations/:reference/delivery-link
router.post('/:reference/delivery-link', authenticate, validate(deliveryLinkSchema), async (req: Request, res: Response) => {
  try {
    const donation = await prisma.donation.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
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
