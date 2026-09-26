import { Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import type { AuthRequest } from '../middleware/auth';

// GET /api/v1/dashboard/stats
export async function getDashboardStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const stats = await dashboardService.getStats(req.userId);

  res.status(200).json({ success: true, data: stats });
}
