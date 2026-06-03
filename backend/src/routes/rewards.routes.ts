import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { MILESTONE } from '../services/milestone.service';

/**
 * Donor rewards API.
 *
 *   GET    /rewards/milestone       — current milestone progress + threshold
 *   GET    /rewards/vouchers        — list the caller's vouchers (active + history)
 *   POST   /rewards/vouchers/:code/redeem
 *                                   — mark a voucher as redeemed (callable by
 *                                     owner; staff can extend later if needed)
 *
 * Mounted under both /internal-api/rewards (web) and /api/rewards (mobile).
 */
const router = Router();

router.get('/milestone', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { milestoneProgress: true },
    });
    const progress = user?.milestoneProgress ?? 0;
    res.json({
      progress,
      threshold: MILESTONE.THRESHOLD,
      remaining: Math.max(0, MILESTONE.THRESHOLD - progress),
      percent: Math.min(100, Math.round((progress / MILESTONE.THRESHOLD) * 100)),
    });
  } catch (err) {
    console.error('[Rewards] milestone error:', err);
    res.status(500).json({ error: 'Failed to load milestone' });
  }
});

router.get('/vouchers', authenticate, async (req: Request, res: Response) => {
  try {
    const rows = await prisma.voucher.findMany({
      where: { userId: req.user!.id },
      orderBy: { issuedAt: 'desc' },
    });
    res.json(
      rows.map((v) => ({
        id: v.id,
        code: v.code,
        type: v.type,
        status: v.status,
        issuedAt: v.issuedAt.toISOString(),
        redeemedAt: v.redeemedAt ? v.redeemedAt.toISOString() : null,
        expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
      })),
    );
  } catch (err) {
    console.error('[Rewards] vouchers error:', err);
    res.status(500).json({ error: 'Failed to load vouchers' });
  }
});

router.post('/vouchers/:code/redeem', authenticate, async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '').toUpperCase().trim();
    const voucher = await prisma.voucher.findUnique({ where: { code } });

    if (!voucher || voucher.userId !== req.user!.id) {
      res.status(404).json({ error: 'Voucher not found' });
      return;
    }
    if (voucher.status !== 'active') {
      res.status(409).json({ error: `Voucher is already ${voucher.status}.` });
      return;
    }
    if (voucher.expiresAt && voucher.expiresAt.getTime() < Date.now()) {
      await prisma.voucher.update({
        where: { id: voucher.id },
        data: { status: 'expired' },
      });
      res.status(409).json({ error: 'Voucher has expired.' });
      return;
    }

    const updated = await prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: 'redeemed', redeemedAt: new Date() },
    });

    res.json({
      success: true,
      voucher: {
        id: updated.id,
        code: updated.code,
        status: updated.status,
        redeemedAt: updated.redeemedAt?.toISOString() || null,
      },
    });
  } catch (err) {
    console.error('[Rewards] redeem error:', err);
    res.status(500).json({ error: 'Failed to redeem voucher' });
  }
});

export default router;
