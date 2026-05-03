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

// POST /internal-api/monetary-donations
router.post('/', upload.single('proofDonation'), validate(monetaryDonationSchema), async (req, res) => {
  try {
    const reference = 'MD-' + uuidv4().substring(0, 10).toUpperCase();
    let proofPath: string | null = null;

    if (req.file) {
      proofPath = await uploadFile(req.file, 'hairlink', 'monetary-donations', 'document');
    }

    // User may or may not be authenticated
    let userId: bigint | null = null;
    try {
      // Try to get user from auth header without failing
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as { userId: string };
        userId = BigInt(decoded.userId);
      }
    } catch (_) { /* anonymous donation */ }

    await prisma.monetaryDonation.create({
      data: {
        userId,
        name: req.body.name || null,
        email: req.body.email || null,
        amount: req.body.amount,
        currency: req.body.currency || 'PHP',
        paymentMethod: req.body.payment_method,
        referenceNumber: reference,
        proofPath,
        status: 'Submitted',
      },
    });

    res.json({ success: true, message: 'Monetary donation processed successfully!', reference });
  } catch (err) {
    console.error('[Monetary] Error:', err);
    res.status(500).json({ error: 'Failed to process donation' });
  }
});

export default router;
