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
 * DELETE /auth/account
 * Permanently deletes the user from both public.users (Prisma) and auth.users (Supabase).
 * Order: delete public.users first, then auth.users via the admin client.
 * If Supabase deletion fails, we still succeed (the public row is already gone).
 */
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    // 1. Delete from public.users
    await prisma.user.delete({ where: { id: userId } });

    // 2. Delete from auth.users via Supabase admin client
    const supabaseAdmin = (await import('../config/supabase')).default;
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      // Log but don't fail — public row already removed
      console.error('[Auth] Failed to delete user from Supabase auth:', authError.message);
    }

    res.json({ message: 'Your account has been permanently deleted.' });
  } catch (err: any) {
    console.error('[Auth] Account deletion error:', err);
    res.status(500).json({ error: 'Account deletion failed', message: err.message });
  }
});

export default router;
