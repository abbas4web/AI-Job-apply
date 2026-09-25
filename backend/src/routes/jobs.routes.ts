import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getJobs,
  getJobById,
  createJob,
  deleteJob,
} from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// GET    /api/v1/jobs
router.get('/', asyncHandler(getJobs));

// GET    /api/v1/jobs/:id
router.get('/:id', asyncHandler(getJobById));

// POST   /api/v1/jobs
router.post('/', asyncHandler(createJob));

// DELETE /api/v1/jobs/:id
router.delete('/:id', asyncHandler(deleteJob));

export default router;
