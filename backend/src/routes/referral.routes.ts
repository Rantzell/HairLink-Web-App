import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { referralCodeSchema } from '../schemas';

const router = Router();

// POST /internal-api/referral
router.post('/', authenticate, validate(referralCodeSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(401).json({ success: false, message: 'Unauthenticated.' }); return; }

    const code = req.body.referral_code.toUpperCase().trim();

    if (user.referredBy) {
      res.status(400).json({ success: false, message: 'You have already used a referral code.' }); return;
    }
    if (user.referralCode === code) {
      res.status(400).json({ success: false, message: 'You cannot use your own referral code.' }); return;
    }

    const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!referrer) {
      res.status(404).json({ success: false, message: 'Invalid referral code.' }); return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { referredBy: referrer.id } });
    res.json({ success: true, message: 'Referral code applied successfully!' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
