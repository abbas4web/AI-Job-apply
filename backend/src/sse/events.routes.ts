import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sseHandler } from './events.controller';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/events
 * Requires a valid JWT — same auth middleware as all other routes.
 * Returns a persistent SSE stream for the authenticated user.
 */
router.get(
  '/',
  authenticate,
  (req: Request, res: Response) => sseHandler(req as AuthRequest, res)
);

export default router;
