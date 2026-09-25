import { Request, Response } from 'express';

// Stubs — implement when auth feature is built

export async function register(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function login(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}

export async function me(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: 'Not implemented' });
}
