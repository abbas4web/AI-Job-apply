import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  markDuplicate,
  deleteJob,
} from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createJobSchema, updateJobSchema } from '../middleware/schemas/job.schemas';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// GET    /api/v1/jobs          — list with filters & pagination
router.get('/', asyncHandler(getJobs));

// GET    /api/v1/jobs/:id      — single job
router.get('/:id', asyncHandler(getJobById));

// POST   /api/v1/jobs          — create job (duplicate guard via externalId)
router.post('/', validate(createJobSchema), asyncHandler(createJob));

// PATCH  /api/v1/jobs/:id      — partial update
router.patch('/:id', validate(updateJobSchema), asyncHandler(updateJob));

// PATCH  /api/v1/jobs/:id/duplicate — explicitly mark/unmark as duplicate
router.patch('/:id/duplicate', asyncHandler(markDuplicate));

// DELETE /api/v1/jobs/:id
router.delete('/:id', asyncHandler(deleteJob));

export default router;
