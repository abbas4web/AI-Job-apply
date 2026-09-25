import { Router } from 'express';
import { asyncHandler } from '../utils';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { runIngestionSchema } from '../ingestion/ingestion.schemas';
import { runIngestion, listSources } from '../controllers/ingestion.controller';

const router = Router();

router.use(authenticate);

// GET  /api/v1/ingestion/sources — list available source handlers
router.get('/sources', asyncHandler(listSources));

// POST /api/v1/ingestion/run    — trigger an ingestion run
router.post('/run', validate(runIngestionSchema), asyncHandler(runIngestion));

export default router;
