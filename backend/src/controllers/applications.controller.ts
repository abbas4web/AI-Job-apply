import { Request, Response } from 'express';

// Stubs — implement when applications feature is built

export async function getApplications(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function getApplicationById(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function createApplication(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function updateApplication(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function deleteApplication(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}
