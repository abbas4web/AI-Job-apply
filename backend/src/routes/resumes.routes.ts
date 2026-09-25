import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getResumes,
  getResumeById,
  uploadResume,
  updateResume,
  deleteResume,
  analyzeResume,
  getResumeAnalysis,
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
router.post('/', asyncHandler(uploadResume));

// PATCH  /api/v1/resumes/:id  — JSON body
router.patch('/:id', validate(updateResumeSchema), asyncHandler(updateResume));

// DELETE /api/v1/resumes/:id
router.delete('/:id', asyncHandler(deleteResume));

// POST   /api/v1/resumes/:id/analyze
// Runs Gemini analysis, validates response, persists profile, returns result
router.post('/:id/analyze', asyncHandler(analyzeResume));

// GET    /api/v1/resumes/:id/analyze
// Returns the last stored analysis without re-running Gemini
router.get('/:id/analyze', asyncHandler(getResumeAnalysis));

export default router;
