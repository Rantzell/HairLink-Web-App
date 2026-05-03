import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Zod validation middleware factory.
 * Validates req.body against the provided schema.
 * On success, replaces req.body with the parsed (sanitized) data.
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
