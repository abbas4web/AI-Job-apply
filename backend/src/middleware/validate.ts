import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate — middleware factory that validates req.body against a Zod schema.
 * Replaces req.body with the parsed (and coerced) output on success.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors;
      res.status(400).json({ success: false, error: 'Validation failed', errors });
      return;
    }

    req.body = result.data;
    next();
  };
}
