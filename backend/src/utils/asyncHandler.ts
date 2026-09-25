import { Request, Response, NextFunction, RequestHandler } from 'express';

// ─────────────────────────────────────────────────────────────
// asyncHandler — wraps async route handlers so thrown errors
// are forwarded to Express's error middleware automatically.
// ─────────────────────────────────────────────────────────────

type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
