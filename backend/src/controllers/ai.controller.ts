import { Request, Response } from 'express';
import { resumesService } from '../services/resumes.service';
import { geminiService } from '../services/gemini.service';
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
