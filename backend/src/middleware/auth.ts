import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { TokenPayload } from '../services/auth.service';

// Extend Express Request with authenticated user fields
export interface AuthRequest extends Request {
  userId: string;
  userRole: string;
}

/**
 * authenticate — verifies the Bearer JWT and attaches userId + userRole
 * to the request. Throws 401 on any failure.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Support both Authorization header (standard) and ?token= query param
  // (needed for EventSource which cannot set custom headers)
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === 'string' && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    res
      .status(401)
      .json({ success: false, error: 'Missing or malformed Authorization header' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    (req as AuthRequest).userId = payload.sub;
    (req as AuthRequest).userRole = payload.role;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }
}

/**
 * requireRole — must be used after `authenticate`.
 * Restricts the route to users with the given role(s).
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as AuthRequest).userRole;

    if (!roles.includes(userRole)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    next();
  };
}
