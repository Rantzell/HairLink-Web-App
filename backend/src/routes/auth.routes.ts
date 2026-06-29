import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /auth/me
 * Returns the current user's profile from public.users.
 * The Supabase JWT is verified by the authenticate middleware.
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Ensure user has a referral code
    if (!user.referralCode) {
      const crypto = require('crypto');
      const code = 'HL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      user = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: code }
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /auth/mark-verified
 * Called after OTP verification is confirmed on the frontend.
 * Sets email_verified_at in public.users so future logins skip OTP.
 */
router.post('/mark-verified', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { emailVerifiedAt: new Date() },
    });
    res.json({ message: 'Email marked as verified.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark email as verified' });
  }
});

/**
 * POST /auth/logout
 * JWT is stateless — the frontend signs out via supabase.auth.signOut().
 * This endpoint exists for compatibility / session cleanup if needed.
 */
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ message: 'Successfully logged out' });
});

/**
 * POST /auth/push-token
 * Receives the Expo Push Token and stores it in the user_push_tokens table.
 */
router.post('/push-token', authenticate, async (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    await prisma.user_push_tokens.upsert({
      where: { expo_push_token: token },
      update: {
        user_id: req.user!.id,
        platform: platform || 'unknown',
        is_active: true,
        updated_at: new Date()
      },
      create: {
        user_id: req.user!.id,
        expo_push_token: token,
        platform: platform || 'unknown',
        is_active: true,
      }
    });

    res.json({ success: true, message: 'Push token saved successfully.' });
  } catch (err) {
    console.error('Failed to save push token:', err);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

export default router;
