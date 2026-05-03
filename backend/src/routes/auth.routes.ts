import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginSchema, registerSchema } from '../schemas';

const router = Router();

// Utility: generate JWT
function signToken(userId: bigint): string {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

// Utility: serialize user for response (BigInt → string)
function serializeUser(user: any) {
  return {
    ...user,
    id: user.id.toString(),
    referredBy: user.referredBy?.toString() || null,
  };
}

// POST /auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, device_name, onesignal_id } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      res.status(422).json({ errors: { email: ['The provided credentials do not match our records.'] } });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated. Please contact support.' });
      return;
    }

    // Sync OneSignal ID if provided (mobile)
    if (onesignal_id) {
      await prisma.user.update({ where: { id: user.id }, data: { onesignalId: onesignal_id } });
    }

    const token = signToken(user.id);

    // Determine redirect based on role
    const redirectUrl: Record<string, string> = {
      recipient: '/recipient/dashboard',
      admin: '/admin/dashboard',
      staff: '/staff/dashboard',
      wigmaker: '/wigmaker/dashboard',
      donor: '/donor/dashboard',
    };

    res.json({
      token,
      user: serializeUser(user),
      redirect: redirectUrl[user.role] || '/donor/dashboard',
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ 
      error: 'Login failed', 
      message: err instanceof Error ? err.message : String(err) 
    });
  }
});

// POST /auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password, country, region, postal_code, age, gender, phone } = req.body;
    const role = req.body.userType || req.body.role || 'donor';

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(422).json({ errors: { email: ['The email has already been taken.'] } });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: `${first_name} ${last_name}`,
        firstName: first_name,
        lastName: last_name,
        role,
        email,
        password: hashedPassword,
        country: country || null,
        region: region || null,
        postalCode: postal_code || null,
        age: age || null,
        gender: gender || null,
        phone: phone || null,
        isActive: true,
      },
    });

    const token = signToken(user.id);
    const redirectUrl = role === 'recipient' ? '/recipient/dashboard' : '/donor/dashboard';

    res.status(201).json({ token, user: serializeUser(user), redirect: redirectUrl });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ 
      error: 'Registration failed', 
      message: err instanceof Error ? err.message : String(err) 
    });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (_req: Request, res: Response) => {
  // JWT is stateless — client discards the token
  res.json({ message: 'Successfully logged out' });
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(serializeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// DELETE /auth/account
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.json({ message: 'Your account has been permanently deleted. We are sorry to see you go.' });
  } catch (err) {
    res.status(500).json({ error: 'Account deletion failed' });
  }
});

export default router;
