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

    // Milestone credits. Earlier guards (no prior `referredBy`, not self-code,
    // valid referrer) ensure this fires at most once per redeemer.
    //   • Referrer earns POINTS.REFERRAL (5)
    //   • Redeemer earns POINTS.REFERRAL_REDEEMED (3)
    try {
      const { addMilestonePoints, POINTS } = await import('../services/milestone.service');
      await Promise.all([
        addMilestonePoints(referrer.id, POINTS.REFERRAL),
        addMilestonePoints(user.id, POINTS.REFERRAL_REDEEMED),
      ]);
    } catch (err) {
      console.warn('[Referral] Milestone credit failed (non-fatal):', err);
    }

    res.json({
      success: true,
      message: 'Referral code applied! You earned 3 stars and your referrer earned 5.',
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
