import { Router } from 'express';
import { asyncHandler } from '../utils';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { runIngestionSchema } from '../ingestion/ingestion.schemas';
import {
  runIngestion,
  listSources,
  listCapabilities,
  checkHealth,
  checkSourceHealth,
} from '../controllers/ingestion.controller';

const router = Router();

// All ingestion endpoints require a valid JWT
router.use(authenticate);

// ── Discovery ────────────────────────────────────────────────

// GET /api/v1/ingestion/sources
// Returns all registered source keys, split by enabled/disabled status
router.get('/sources', asyncHandler(listSources));

// GET /api/v1/ingestion/capabilities
// Returns the full SourceCapabilities descriptor for every registered source
router.get('/capabilities', asyncHandler(listCapabilities));

// ── Health ───────────────────────────────────────────────────

// GET /api/v1/ingestion/health
// Probes every registered source and returns an aggregated readiness report
router.get('/health', asyncHandler(checkHealth));

// GET /api/v1/ingestion/health/:source
// Probes a single named source, e.g. GET /ingestion/health/OTHER
router.get('/health/:source', asyncHandler(checkSourceHealth));

// ── Ingestion trigger ────────────────────────────────────────

// POST /api/v1/ingestion/run
// Triggers an ingestion run for one or more sources
router.post('/run', validate(runIngestionSchema), asyncHandler(runIngestion));

export default router;
