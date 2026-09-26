import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createApplicationSchema,
  updateApplicationSchema,
} from '../middleware/schemas/application.schemas';

const router = Router();

// All application routes require authentication
router.use(authenticate);

// GET    /api/v1/applications          — list (filtered, paginated)
router.get('/', asyncHandler(getApplications));

// GET    /api/v1/applications/:id      — single application with job details
router.get('/:id', asyncHandler(getApplicationById));

// POST   /api/v1/applications          — create application
router.post('/', validate(createApplicationSchema), asyncHandler(createApplication));

// PATCH  /api/v1/applications/:id      — update status / notes / matchScore
router.patch('/:id', validate(updateApplicationSchema), asyncHandler(updateApplication));

// DELETE /api/v1/applications/:id      — remove application
router.delete('/:id', asyncHandler(deleteApplication));

export default router;
