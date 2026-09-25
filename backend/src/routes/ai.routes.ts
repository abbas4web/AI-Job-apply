import { Router } from 'express';
import { asyncHandler } from '../utils';
import { analyzeResume, analyzeText } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// POST /api/v1/ai/analyze-resume/:resumeId
// Analyzes a stored resume by its ID (fetched from DB, text sent to Gemini)
router.post(
  '/analyze-resume/:resumeId',
  asyncHandler(analyzeResume)
);

// POST /api/v1/ai/analyze-text
// Analyzes raw resume text sent directly in the request body
router.post(
  '/analyze-text',
  validate(z.object({ text: z.string().min(50, 'Text too short to analyze') })),
  asyncHandler(analyzeText)
);

export default router;
