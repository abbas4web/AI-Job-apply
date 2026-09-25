import { Request, Response } from 'express';

// Stubs — implement when jobs feature is built

export async function getJobs(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function getJobById(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function createJob(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function deleteJob(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}
