import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

// All dashboard routes require a valid JWT
router.use(authenticate);

// GET /api/v1/dashboard/stats
router.get(
  '/stats',
  asyncHandler((req: Request, res: Response) =>
    getDashboardStats(req as unknown as AuthRequest, res)
  )
);

export default router;
