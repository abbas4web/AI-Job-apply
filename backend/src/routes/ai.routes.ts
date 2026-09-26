import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  analyzeResume,
  analyzeText,
  matchJob,
  generateCoverLetter,
} from '../controllers/ai.controller';
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

// POST /api/v1/ai/match-job
// Scores how well a resume profile matches a job listing.
// Returns matchScore (0–100) + matched/missing skills + experience/location flags.
// Does NOT make any application decision — that is the backend's responsibility.
router.post(
  '/match-job',
  validate(
    z.object({
      resumeId: z.string().min(1, 'resumeId is required'),
      jobId:    z.string().min(1, 'jobId is required'),
    })
  ),
  asyncHandler(matchJob)
);

// POST /api/v1/ai/cover-letter
// Generates a concise, grounded cover letter ({ subject, body }) from a
// stored resume profile + a specific job.
// Gemini is explicitly instructed not to invent companies, titles,
// technologies, achievements, or education not present in the profile.
router.post(
  '/cover-letter',
  validate(
    z.object({
      resumeId: z.string().min(1, 'resumeId is required'),
      jobId:    z.string().min(1, 'jobId is required'),
    })
  ),
  asyncHandler(generateCoverLetter)
);

export default router;
