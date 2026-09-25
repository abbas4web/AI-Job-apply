import { Router } from 'express';
import { asyncHandler } from '../utils';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

// GET /api/health
router.get('/', asyncHandler(healthCheck));

export default router;
