import { Request, Response, NextFunction } from 'express';
import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
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

const JWKS_URL = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const remoteJWKS = createRemoteJWKSet(new URL(JWKS_URL));

// Pinned local copy of the JWKS so per-request verification never needs the
// network. The first successful fetch (with retries) populates this; until
// then we fall back to the remote set, which also caches internally.
let localJWKS: ReturnType<typeof createLocalJWKSet> | null = null;

async function loadJWKS(): Promise<void> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(JWKS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const jwks = await res.json();
      localJWKS = createLocalJWKSet(jwks);
      console.log(`[Auth] JWKS loaded (${jwks.keys?.length ?? 0} key(s))`);
      return;
    } catch (err: any) {
      console.warn(`[Auth] JWKS fetch attempt ${attempt} failed: ${err?.message || err}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  console.error('[Auth] Could not pre-load JWKS — will rely on remote fetch per request');
}

loadJWKS();
setInterval(loadJWKS, 60 * 60 * 1000);

async function verifyJWT(token: string): Promise<JWTPayload> {
  const issuer = `${process.env.SUPABASE_URL}/auth/v1`;
  if (localJWKS) {
    return (await jwtVerify(token, localJWKS, { issuer })).payload;
  }
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return (await jwtVerify(token, remoteJWKS, { issuer })).payload;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (!msg.includes('fetch failed') && err?.code !== 'ERR_JOSE_GENERIC') throw err;
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}

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
    let payload: JWTPayload;
    try {
      payload = await verifyJWT(token);
    } catch (jwtErr: any) {
      console.error('[Auth] jwtVerify failed:', jwtErr?.code, jwtErr?.message);
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
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        firstName: true,
        lastName: true,
        isActive: true,
        age: true,
        gender: true,
        phone: true,
      },
    });

    // Auto-provision the public.users row on first sign-in if missing.
    // This is the fallback for accounts that exist in auth.users but never
    // got an insert (e.g. Supabase trigger missing or new accounts).
    if (!user) {
      const meta = (payload.user_metadata || payload.raw_user_meta_data || {}) as any;
      const email = (payload.email as string) || meta.email || `${userId}@unknown.local`;
      const fullName: string = (meta.full_name || meta.name || email.split('@')[0] || 'New User').toString();
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(' ') || firstName;
      const rawRole = (meta.role || 'donor').toString().toLowerCase();
      const role = ['donor', 'recipient', 'staff', 'admin', 'wigmaker'].includes(rawRole) ? rawRole : 'donor';

      const crypto = require('crypto');
      const referralCode = 'HL-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            email,
            name: fullName,
            firstName,
            lastName,
            role,
            phone: meta.phone || null,
            age: meta.age ? parseInt(String(meta.age), 10) || null : null,
            gender: meta.gender ? String(meta.gender).toLowerCase() : null,
            referralCode,
            emailVerifiedAt: payload.email_confirmed_at ? new Date(payload.email_confirmed_at as string) : new Date(),
          },
          select: {
            id: true, email: true, role: true, name: true,
            firstName: true, lastName: true, isActive: true,
            age: true, gender: true, phone: true,
          },
        });
        console.log(`[Auth] Auto-provisioned public.users row for ${email} (${userId})`);
      } catch (createErr: any) {
        // Race: another request created it first — re-fetch
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true, email: true, role: true, name: true,
            firstName: true, lastName: true, isActive: true,
            age: true, gender: true, phone: true,
          },
        });
        if (!user) {
          console.error('[Auth] Failed to provision user row', createErr);
          res.status(500).json({ error: 'Failed to initialize user profile' });
          return;
        }
      }
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    // Backfill profile fields from JWT metadata for legacy users whose
    // public.users row was created before the auto-provision path persisted
    // age/gender/phone (signup screen submits them as Supabase metadata).
    // Runs at most once per field per account — once stored, the check
    // short-circuits on future requests.
    if (user.age == null || user.gender == null || (!user.phone && (payload.user_metadata as any)?.phone)) {
      const meta = (payload.user_metadata || payload.raw_user_meta_data || {}) as any;
      const patch: any = {};
      if (user.age == null && meta.age) {
        const parsed = parseInt(String(meta.age), 10);
        if (!Number.isNaN(parsed)) patch.age = parsed;
      }
      if (user.gender == null && meta.gender) {
        patch.gender = String(meta.gender).toLowerCase();
      }
      if (!user.phone && meta.phone) {
        patch.phone = String(meta.phone);
      }
      if (Object.keys(patch).length) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: patch,
            select: {
              id: true, email: true, role: true, name: true,
              firstName: true, lastName: true, isActive: true,
              age: true, gender: true, phone: true,
            },
          });
          console.log(`[Auth] Backfilled profile fields for ${user.email}:`, Object.keys(patch));
        } catch (backfillErr) {
          console.warn('[Auth] Backfill update failed (non-fatal):', backfillErr);
        }
      }
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
    console.error('[Auth] Unexpected error in authenticate middleware:', err);
    res.status(500).json({ error: 'Authentication processing failed', detail: err?.message });
  }
}
