import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Role-based access middleware.
 * Queries the DB for the real-time role — never trusts the frontend.
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (!dbUser || !roles.includes(dbUser.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      req.userRole = dbUser.role;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
