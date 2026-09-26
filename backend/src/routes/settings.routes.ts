import { Router } from 'express';
import { asyncHandler } from '../utils';
import {
  getAutomationSettings,
  updateAutomationSettings,
} from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateAutomationSettingsSchema } from '../middleware/schemas/settings.schemas';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// GET   /api/v1/settings/automation
// Returns the user's automation settings (creates defaults on first call).
router.get('/automation', asyncHandler(getAutomationSettings));

// PATCH /api/v1/settings/automation
// Partially updates one or more settings fields.
router.patch(
  '/automation',
  validate(updateAutomationSettingsSchema),
  asyncHandler(updateAutomationSettings),
);

export default router;
