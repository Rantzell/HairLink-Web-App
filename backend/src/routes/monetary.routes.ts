import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { monetaryDonationSchema } from '../schemas';
import { uploadFile } from '../services/storage.service';
import { notifyMonetaryReceived } from '../services/notification.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /internal-api/monetary/donate
router.post('/donate', upload.single('proof'), authenticate, validate(monetaryDonationSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const reference = 'MD-' + uuidv4().substring(0, 10).toUpperCase();
    let proofPath: string | null = null;

    console.log(`[Monetary] Processing donation for user ${userId}. File present: ${!!req.file}`);
    
    if (req.file) {
      proofPath = await uploadFile(req.file, 'hairlink', 'monetary_donations/proofs', 'document');
      console.log(`[Monetary] Proof uploaded: ${proofPath}`);
    } else {
      console.warn('[Monetary] No proof file found in request');
    }
    const validatedData = req.body;

    // Fallback for name/email if missing in request but available in user profile
    const finalName = validatedData.name || (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}`.trim() : req.user?.name);
    const finalEmail = validatedData.email || req.user?.email;

    const donation = await prisma.monetaryDonation.create({
      data: {
        userId,
        name: finalName || null,
        email: finalEmail || null,
        amount: validatedData.amount,
        currency: validatedData.currency || 'PHP',
        paymentMethod: validatedData.payment_method,
        referenceNumber: reference,
        proofPath,
        status: 'Submitted',
        anonymous: validatedData.is_anonymous || false,
      },
    });

    // Confirm receipt to the donor; verification will be a separate notification.
    await notifyMonetaryReceived(userId, Number(validatedData.amount || 0), reference);

    res.json({ success: true, message: 'Monetary donation processed successfully!', reference });
  } catch (err) {
    console.error('[Monetary] Error:', err);
    res.status(500).json({ error: 'Failed to process donation' });
  }
});

// GET /api/monetary
// List the caller's monetary donations, newest first. Used by the mobile
// donation history screen to merge alongside hair donations from /donations.
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await prisma.monetaryDonation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      rows.map((r) => ({
        id: `monetary-${r.id}`,
        reference: r.referenceNumber,
        amount: Number(r.amount),
        currency: r.currency,
        paymentMethod: r.paymentMethod,
        status: r.status,
        anonymous: r.anonymous,
        proofPath: r.proofPath,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error('[Monetary] List error:', err);
    res.status(500).json({ error: 'Failed to fetch monetary donations' });
  }
});

export default router;
