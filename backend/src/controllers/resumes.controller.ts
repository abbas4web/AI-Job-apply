import { Request, Response } from 'express';

// Stubs — implement when resumes feature is built

export async function getResumes(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function getResumeById(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function createResume(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function updateResume(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function deleteResume(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}
