import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getResumes,
  getResumeById,
  uploadResume,
  updateResume,
  deleteResume,
} from '../controllers/resumes.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateResumeSchema } from '../middleware/schemas/resume.schemas';

const router = Router();

// All resume routes require authentication
router.use(authenticate);

// GET    /api/v1/resumes
router.get('/', asyncHandler(getResumes));

// GET    /api/v1/resumes/:id
router.get('/:id', asyncHandler(getResumeById));

// POST   /api/v1/resumes  — multipart/form-data, field: "resume" (PDF)
// Note: multer runs inside the controller so we do NOT use express.json() here
router.post('/', asyncHandler(uploadResume));

// PATCH  /api/v1/resumes/:id  — JSON body
router.patch('/:id', validate(updateResumeSchema), asyncHandler(updateResume));

// DELETE /api/v1/resumes/:id
router.delete('/:id', asyncHandler(deleteResume));

export default router;
