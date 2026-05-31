import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const router = Router();

// Map roles to demo emails (must match seeded accounts)
const demoMap: Record<string, string> = {
  admin: 'admin@hairlink.local',
  donor: 'donor.demo@hairlink.local',
  recipient: 'recipient.demo@hairlink.local',
  staff: 'staff.demo@hairlink.local',
  wigmaker: 'wigmaker.demo@hairlink.local',
};

/**
 * POST /auth/demo
 * Body: { role: string }
 * Dev-only helper: uses the Supabase service_role key server-side to exchange
 * demo user credentials for a session token and returns it to the caller.
 */
router.post('/demo', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Not allowed in production' });
    return;
  }

  const role = String(req.body?.role || 'donor');
  const email = demoMap[role];
  if (!email) {
    res.status(400).json({ error: 'Unknown demo role' });
    return;
  }

  // Passwords are known for demo accounts in seed-demo-users.ts
  const passwordMap: Record<string, string> = {
    admin: 'admin12345',
    donor: 'donor12345',
    recipient: 'recipient12345',
    staff: 'staff12345',
    wigmaker: 'wigmaker12345',
  };

  const password = passwordMap[role];
  try {
    const tokenUrl = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return res.status(500).json({ error: 'Service role key missing on server' });

    const resp = await axios.post(tokenUrl, { email, password }, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    // Return the session object to the client so it can call supabase.auth.setSession
    return res.json(resp.data);
  } catch (err: any) {
    console.error('[DemoAuth] Error:', err?.response?.data || err.message || err);
    const message = err?.response?.data?.message || err?.message || 'Demo auth failed';
    return res.status(500).json({ error: message, details: err?.response?.data });
  }
});

export default router;
