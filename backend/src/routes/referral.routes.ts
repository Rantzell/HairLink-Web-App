import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { referralCodeSchema } from '../schemas';

const router = Router();

function generateReferralCode(): string {
  // 6-char alphanumeric, prefixed HL- for brand consistency
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `HL-${code}`;
}

// POST /internal-api/referral/generate — create or rotate the caller's referral code
router.post('/generate', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(401).json({ success: false, message: 'Unauthenticated.' }); return; }

    // Try a few times to avoid the (very unlikely) collision
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferralCode();
      const existing = await prisma.user.findFirst({ where: { referralCode: candidate } });
      if (!existing) { code = candidate; break; }
    }
    if (!code) {
      res.status(500).json({ success: false, message: 'Could not allocate a unique code, please try again.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
      select: { referralCode: true },
    });

    res.json({ success: true, referralCode: updated.referralCode });
  } catch (err) {
    console.error('[Referral] generate failed:', err);
    res.status(500).json({ success: false, message: 'Failed to generate referral code.' });
  }
});

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

    // Milestone: credit the *referrer* with referral points. We only reach
    // this line after the earlier guard ensured the redeemer had no prior
    // `referredBy` — so this fires at most once per (redeemer, referrer) pair.
    try {
      const { addMilestonePoints, POINTS } = await import('../services/milestone.service');
      await addMilestonePoints(referrer.id, POINTS.REFERRAL);
    } catch (err) {
      console.warn('[Referral] Milestone credit failed (non-fatal):', err);
    }

    res.json({ success: true, message: 'Referral code applied successfully!' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
