import { Request, Response } from 'express';
import { ingestionService } from '../ingestion/IngestionService';
import { getRegisteredSources } from '../ingestion/registry';
import type { AuthRequest } from '../middleware/auth';
import type { RunIngestionInput } from '../ingestion/ingestion.schemas';

// POST /api/v1/ingestion/run
export async function runIngestion(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as RunIngestionInput;

  // Default to every registered source when the caller doesn't specify
  const sources = body.sources ?? getRegisteredSources();

  const results = await ingestionService.runAll(userId, {
    query:    body.query,
    location: body.location,
    limit:    body.limit,
  }, sources);

  const totals = results.reduce(
    (acc, r) => {
      acc.fetched  += r.fetched;
      acc.created  += r.created;
      acc.skipped  += r.skipped;
      acc.failed   += r.failed;
      return acc;
    },
    { fetched: 0, created: 0, skipped: 0, failed: 0 },
  );

  res.status(200).json({
    success: true,
    summary: totals,
    results,
  });
}

// GET /api/v1/ingestion/sources
// Returns which sources currently have a registered handler
export async function listSources(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: getRegisteredSources(),
  });
}
