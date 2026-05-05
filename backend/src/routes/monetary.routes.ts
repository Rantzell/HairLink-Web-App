import { Router } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { monetaryDonationSchema } from '../schemas';
import { uploadFile } from '../services/storage.service';
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

    res.json({ success: true, message: 'Monetary donation processed successfully!', reference });
  } catch (err) {
    console.error('[Monetary] Error:', err);
    res.status(500).json({ error: 'Failed to process donation' });
  }
});

export default router;
