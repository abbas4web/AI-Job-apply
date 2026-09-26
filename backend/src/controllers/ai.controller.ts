import { Request, Response } from 'express';
import { resumesService } from '../services/resumes.service';
import { geminiService } from '../services/gemini.service';
import { aiService } from '../services/ai.service';
import { AppError } from '../utils/AppError';
import type { AuthRequest } from '../middleware/auth';

// POST /api/v1/ai/analyze-resume/:resumeId
// Fetches the resume from DB (ownership checked), sends to Gemini,
// returns structured JSON analysis.
export async function analyzeResume(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const { resumeId } = req.params;

  if (!resumeId) {
    throw AppError.badRequest('resumeId param is required');
  }

  const analysis = await resumesService.analyze(resumeId, userId);

  res.status(200).json({
    success: true,
    data: analysis,
  });
}

// POST /api/v1/ai/analyze-text
// Accepts raw resume text directly (for quick testing or frontend use).
export async function analyzeText(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    throw AppError.badRequest('Request body must include a non-empty "text" field');
  }

  if (text.length > 20_000) {
    throw AppError.badRequest('Text too long. Maximum 20 000 characters.');
  }

  const analysis = await geminiService.analyzeResume(text);

  res.status(200).json({
    success: true,
    data: analysis,
  });
}

// POST /api/v1/ai/match-job
// Scores how well the user's resume profile fits a specific job.
// Returns a pure match signal — the backend decides what to do with it.
export async function matchJob(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const { resumeId, jobId } = req.body as { resumeId?: string; jobId?: string };

  if (!resumeId?.trim()) throw AppError.badRequest('resumeId is required');
  if (!jobId?.trim())    throw AppError.badRequest('jobId is required');

  const result = await aiService.matchJob(userId, resumeId, jobId);

  res.status(200).json({ success: true, data: result });
}
