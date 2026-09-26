import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import type { AuthRequest } from '../middleware/auth';
import type { UpdateAutomationSettingsInput } from '../middleware/schemas/settings.schemas';

// GET /api/v1/settings/automation
// Returns the authenticated user's automation settings.
// Creates them with safe defaults on first call.
export async function getAutomationSettings(
  req: Request,
  res: Response,
): Promise<void> {
  const { userId } = req as AuthRequest;

  const settings = await settingsService.getOrCreate(userId);

  res.status(200).json({ success: true, data: settings });
}

// PATCH /api/v1/settings/automation
// Partially updates the user's automation settings.
// Only the fields present in the request body are changed.
export async function updateAutomationSettings(
  req: Request,
  res: Response,
): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as UpdateAutomationSettingsInput;

  const settings = await settingsService.update(userId, body);

  res.status(200).json({ success: true, data: settings });
}
