import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import prisma from '../config/database';

export interface AuthUser {
  id: string;   // UUID from Supabase auth.users
  email: string;
  role: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userRole?: string;
    }
  }
}

/**
 * Supabase JWKS endpoint — fetched ONCE at startup and cached by jose.
 * This enables fast, LOCAL RS256 JWT verification with no network call per request.
 */
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

// High-performance in-memory cache for authenticated users (30s TTL)
const userCache = new Map<string, { user: AuthUser; expiry: number }>();
const CACHE_TTL = 30 * 1000;

/**
 * Verifies the Supabase JWT locally using cached JWKS public keys.
 * No external API call on every request — fast and reliable.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : (req.headers['x-auth-token'] as string | undefined);

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify JWT locally
    let payload: any;
    try {
      const result = await jwtVerify(token, JWKS, {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      });
      payload = result.payload;
    } catch (jwtErr: any) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const userId = payload.sub as string;
    if (!userId) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // Check memory cache first for extreme speed
    const cached = userCache.get(userId);
    if (cached && cached.expiry > Date.now()) {
      req.user = cached.user;
      return next();
    }

    // Look up profile in public.users
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found in local database' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    const userData: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Store in cache for 30s
    userCache.set(userId, { user: userData, expiry: Date.now() + CACHE_TTL });

    req.user = userData;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
