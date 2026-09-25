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

const router = Router();

// All application routes require authentication
router.use(authenticate);

// GET    /api/v1/applications
router.get('/', asyncHandler(getApplications));

// GET    /api/v1/applications/:id
router.get('/:id', asyncHandler(getApplicationById));

// POST   /api/v1/applications
router.post('/', asyncHandler(createApplication));

// PATCH  /api/v1/applications/:id
router.patch('/:id', asyncHandler(updateApplication));

// DELETE /api/v1/applications/:id
router.delete('/:id', asyncHandler(deleteApplication));

export default router;
