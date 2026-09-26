import { Request, Response } from 'express';
import { applicationsService } from '../services/applications.service';
import { AppError } from '../utils/AppError';
import {
  getApplicationsQuerySchema,
} from '../middleware/schemas/application.schemas';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../middleware/schemas/application.schemas';
import type { AuthRequest } from '../middleware/auth';

// GET /api/v1/applications
export async function getApplications(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  const parsed = getApplicationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    res.status(400).json({ success: false, error: 'Invalid query parameters', errors });
    return;
  }

  const result = await applicationsService.findAll(userId, parsed.data);

  res.status(200).json({ success: true, ...result });
}

// GET /api/v1/applications/:id
export async function getApplicationById(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  const application = await applicationsService.findById(req.params.id, userId);

  res.status(200).json({ success: true, data: application });
}

// POST /api/v1/applications
export async function createApplication(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as CreateApplicationInput;

  const application = await applicationsService.create(userId, body);

  res.status(201).json({ success: true, data: application });
}

// PATCH /api/v1/applications/:id
export async function updateApplication(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as UpdateApplicationInput;

  const application = await applicationsService.update(req.params.id, userId, body);

  res.status(200).json({ success: true, data: application });
}

// DELETE /api/v1/applications/:id
export async function deleteApplication(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;

  await applicationsService.delete(req.params.id, userId);

  res.status(200).json({ success: true, message: 'Application deleted' });
}
