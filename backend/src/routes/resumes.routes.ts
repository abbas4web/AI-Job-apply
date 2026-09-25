import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getResumes,
  getResumeById,
  createResume,
  updateResume,
  deleteResume,
} from '../controllers/resumes.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All resume routes require authentication
router.use(authenticate);

// GET    /api/v1/resumes
router.get('/', asyncHandler(getResumes));

// GET    /api/v1/resumes/:id
router.get('/:id', asyncHandler(getResumeById));

// POST   /api/v1/resumes
router.post('/', asyncHandler(createResume));

// PATCH  /api/v1/resumes/:id
router.patch('/:id', asyncHandler(updateResume));

// DELETE /api/v1/resumes/:id
router.delete('/:id', asyncHandler(deleteResume));

export default router;
