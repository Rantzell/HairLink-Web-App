import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler — must be registered LAST in Express app.
 * Catches Prisma errors (P****) and returns generic messages.
 * Never leaks internal details to the client.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[ErrorHandler]', err);

  // Prisma errors
  if (err.code?.startsWith('P')) {
    res.status(500).json({ error: 'A database error occurred.' });
    return;
  }

  // Zod errors (shouldn't reach here if validate middleware is used, but just in case)
  if (err.name === 'ZodError') {
    res.status(400).json({ error: 'Invalid input', details: err.flatten?.()?.fieldErrors });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
    return;
  }

  // Default
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: 'Something went wrong.' });
}
