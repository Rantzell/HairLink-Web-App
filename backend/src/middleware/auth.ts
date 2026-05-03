import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

export interface AuthUser {
  id: number;
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

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // Also check for session cookie/token for web auth
      const token = req.headers['x-auth-token'] as string;
      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      await verifyAndAttach(token, req, res, next);
      return;
    }

    const token = authHeader.split(' ')[1];
    await verifyAndAttach(token, req, res, next);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function verifyAndAttach(token: string, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.userId) },
      select: { id: true, email: true, role: true, name: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
